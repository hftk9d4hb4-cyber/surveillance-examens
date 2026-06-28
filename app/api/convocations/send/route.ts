import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasStaffRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { sendConvocationMail } from "@/lib/mail";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!hasStaffRole((session?.user as any)?.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const form = await request.formData();
  const examId = String(form.get("examId") ?? "");
  const resend = form.get("resend") === "true";

  const assignments = await prisma.assignment.findMany({
    where: examId ? { examId } : {},
    include: { exam: true, user: true }
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const assignment of assignments) {
    const existing = await prisma.convocation.findUnique({ where: { assignmentId: assignment.id } });
    if (existing?.status === "SENT" && !resend) {
      skipped++;
      continue;
    }

    try {
      const info = await sendConvocationMail(assignment.exam, assignment.user);
      await prisma.convocation.upsert({
        where: { assignmentId: assignment.id },
        update: { status: "SENT", sentAt: new Date(), lastError: null, messageId: String((info as any).messageId ?? "") },
        create: { assignmentId: assignment.id, examId: assignment.examId, userId: assignment.userId, status: "SENT", sentAt: new Date(), messageId: String((info as any).messageId ?? "") }
      });
      sent++;
    } catch (error) {
      await prisma.convocation.upsert({
        where: { assignmentId: assignment.id },
        update: { status: "ERROR", lastError: error instanceof Error ? error.message : "Erreur inconnue" },
        create: { assignmentId: assignment.id, examId: assignment.examId, userId: assignment.userId, status: "ERROR", lastError: error instanceof Error ? error.message : "Erreur inconnue" }
      });
      failed++;
    }
  }

  return NextResponse.redirect(new URL(`/convocations?sent=${sent}&skipped=${skipped}&failed=${failed}`, request.url));
}
