import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasStaffRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { sendConvocationMail } from "@/lib/mail";
import { writeAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasStaffRole(session.user.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const formData = await request.formData();
  const examId = String(formData.get("examId") || "");
  const year = String(formData.get("academicYear") || "");
  const resend = formData.get("resend") === "true";
  const assignments = await prisma.assignment.findMany({
    where: {
      ...(examId ? { examId } : {}),
      ...(year ? { exam: { academicYear: year, status: "PUBLISHED" } } : { exam: { status: "PUBLISHED" } })
    },
    include: { exam: true, user: true, convocation: true },
    orderBy: [{ exam: { date: "asc" } }],
    take: 25
  });
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const assignment of assignments) {
    if (assignment.convocation?.status === "SENT" && !resend) {
      skipped += 1;
      continue;
    }
    try {
      const result = await sendConvocationMail(assignment.exam, assignment.user);
      await prisma.convocation.upsert({
        where: { assignmentId: assignment.id },
        update: { status: "SENT", sentAt: new Date(), lastError: null, messageId: result.messageId },
        create: { assignmentId: assignment.id, examId: assignment.examId, userId: assignment.userId, status: "SENT", sentAt: new Date(), messageId: result.messageId }
      });
      sent += 1;
    } catch (error) {
      await prisma.convocation.upsert({
        where: { assignmentId: assignment.id },
        update: { status: "ERROR", lastError: error instanceof Error ? error.message.slice(0, 500) : "Erreur inconnue" },
        create: { assignmentId: assignment.id, examId: assignment.examId, userId: assignment.userId, status: "ERROR", lastError: error instanceof Error ? error.message.slice(0, 500) : "Erreur inconnue" }
      });
      failed += 1;
    }
  }
  await writeAudit({ actorId: session.user.id, action: "CONVOCATIONS_SENT", entity: "Convocation", details: { sent, skipped, failed, examId: examId || null, year: year || null } });
  return NextResponse.redirect(new URL(`/convocations?year=${encodeURIComponent(year)}&sent=${sent}&skipped=${skipped}&failed=${failed}`, request.url), 303);
}
