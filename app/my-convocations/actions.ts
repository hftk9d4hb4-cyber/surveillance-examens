"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { acknowledgementDecision } from "@/lib/acknowledgement-policy";
import { writeAudit } from "@/lib/audit";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { todayInTimeZone } from "@/lib/time";

export async function acknowledgeAssignment(formData: FormData) {
  const assignmentId = String(formData.get("assignmentId") || "");
  if (!assignmentId) redirect("/my-convocations?error=invalid");

  const { user } = await requireUser();
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      exam: true,
      convocation: true,
      acknowledgement: true
    }
  });
  if (!assignment) redirect("/my-convocations?error=invalid");

  const decision = acknowledgementDecision({
    actorId: user.id,
    actorRole: user.role,
    assignmentUserId: assignment.userId,
    convocationStatus: assignment.convocation?.status ?? null,
    examStatus: assignment.exam.status,
    examDate: assignment.exam.date,
    alreadyAcknowledged: Boolean(assignment.acknowledgement)
  }, todayInTimeZone());

  if (decision === "ALREADY_ACKNOWLEDGED") redirect("/my-convocations?already=1");
  if (decision !== "ALLOWED") redirect(`/my-convocations?error=${decision.toLowerCase()}`);

  const created = await prisma.assignmentAcknowledgement.createMany({
    data: [{ assignmentId: assignment.id, userId: user.id }],
    skipDuplicates: true
  });
  if (created.count === 0) redirect("/my-convocations?already=1");
  const acknowledgement = await prisma.assignmentAcknowledgement.findUniqueOrThrow({
    where: { assignmentId: assignment.id }
  });
  await writeAudit({
    actorId: user.id,
    action: "ASSIGNMENT_ACKNOWLEDGED",
    entity: "Assignment",
    entityId: assignment.id,
    details: {
      acknowledgementId: acknowledgement.id,
      examId: assignment.examId,
      acknowledgedAt: acknowledgement.acknowledgedAt.toISOString()
    }
  });
  revalidatePath("/my-convocations");
  revalidatePath("/convocations");
  revalidatePath("/dashboard");
  redirect("/my-convocations?acknowledged=1");
}
