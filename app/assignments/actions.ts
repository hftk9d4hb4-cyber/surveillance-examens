"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { writeAudit } from "@/lib/audit";

export async function addManualAssignment(formData: FormData) {
  const { user: actor } = await requireStaff();
  const examId = String(formData.get("examId") || "");
  const userId = String(formData.get("userId") || "");
  const [exam, teacher] = await Promise.all([
    prisma.exam.findUnique({ where: { id: examId }, include: { _count: { select: { assignments: true } } } }),
    prisma.user.findUnique({ where: { id: userId } })
  ]);
  if (!exam || exam.status !== "PUBLISHED" || !teacher || teacher.role !== "TEACHER" || !teacher.isActive) redirect("/assignments?error=invalid");
  const returnUrl = `/assignments?year=${encodeURIComponent(exam.academicYear)}`;
  const existing = await prisma.assignment.findUnique({ where: { examId_userId: { examId, userId } } });
  if (!existing && exam._count.assignments >= exam.requiredSupervisors) redirect(`${returnUrl}&error=covered`);
  const unavailable = await prisma.availability.findUnique({ where: { userId_date_halfDay: { userId, date: exam.date, halfDay: exam.halfDay } } });
  if (unavailable?.status === "UNAVAILABLE") redirect(`${returnUrl}&error=unavailable`);
  const sameDay = await prisma.assignment.findFirst({ where: { userId, exam: { date: exam.date }, NOT: { examId } } });
  if (sameDay) redirect(`${returnUrl}&error=sameday`);
  const annualLoad = await prisma.assignment.count({ where: { userId, exam: { academicYear: exam.academicYear } } });
  if (teacher.quotaAnnual !== null && annualLoad >= teacher.quotaAnnual && !existing) redirect(`${returnUrl}&error=quota`);

  await prisma.assignment.upsert({
    where: { examId_userId: { examId, userId } },
    update: { source: "MANUAL", locked: true, score: 999, scoreDetails: { manual: true } },
    create: { examId, userId, source: "MANUAL", locked: true, score: 999, scoreDetails: { manual: true } }
  });
  await writeAudit({ actorId: actor.id, action: "ASSIGNMENT_ADDED", entity: "Assignment", entityId: `${examId}:${userId}` });
  revalidatePath("/assignments");
  redirect(`${returnUrl}&manual=1`);
}

export async function removeAssignment(formData: FormData) {
  const { user: actor } = await requireStaff();
  const id = String(formData.get("id") || "");
  const assignment = await prisma.assignment.findUnique({ where: { id }, include: { exam: true, convocation: true } });
  if (!assignment) return;
  if (assignment.convocation?.status === "SENT") {
    redirect(`/assignments?year=${encodeURIComponent(assignment.exam.academicYear)}&error=sent`);
  }
  await prisma.assignment.delete({ where: { id } });
  await writeAudit({ actorId: actor.id, action: "ASSIGNMENT_REMOVED", entity: "Assignment", entityId: id, details: { convocationWasSent: assignment.convocation?.status === "SENT" } });
  revalidatePath("/assignments");
  redirect(`/assignments?year=${encodeURIComponent(assignment.exam.academicYear)}`);
}

export async function toggleAssignmentLock(formData: FormData) {
  const { user: actor } = await requireStaff();
  const id = String(formData.get("id") || "");
  const assignment = await prisma.assignment.findUnique({ where: { id }, include: { exam: true, convocation: true } });
  if (!assignment) return;
  if (assignment.convocation?.status === "SENT") {
    redirect(`/assignments?year=${encodeURIComponent(assignment.exam.academicYear)}&error=sent`);
  }
  await prisma.assignment.update({ where: { id }, data: { locked: !assignment.locked } });
  await writeAudit({ actorId: actor.id, action: assignment.locked ? "ASSIGNMENT_UNLOCKED" : "ASSIGNMENT_LOCKED", entity: "Assignment", entityId: id });
  revalidatePath("/assignments");
  redirect(`/assignments?year=${encodeURIComponent(assignment.exam.academicYear)}`);
}
