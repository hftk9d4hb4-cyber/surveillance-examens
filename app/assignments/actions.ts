"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { dateKey } from "@/lib/format";
import { writeAudit } from "@/lib/audit";

export async function addManualAssignment(formData: FormData) {
  const { user: actor } = await requireStaff();
  const examId = String(formData.get("examId") || "");
  const userId = String(formData.get("userId") || "");
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  const teacher = await prisma.user.findUnique({ where: { id: userId } });
  if (!exam || !teacher || teacher.role !== "TEACHER" || !teacher.isActive) redirect("/assignments?error=invalid");
  const unavailable = await prisma.availability.findUnique({ where: { userId_date_halfDay: { userId, date: exam.date, halfDay: exam.halfDay } } });
  if (unavailable?.status === "UNAVAILABLE") redirect(`/assignments?year=${encodeURIComponent(exam.academicYear)}&error=unavailable`);
  const sameDay = await prisma.assignment.findFirst({ where: { userId, exam: { date: exam.date }, NOT: { examId } } });
  if (sameDay) redirect(`/assignments?year=${encodeURIComponent(exam.academicYear)}&error=sameday`);
  await prisma.assignment.upsert({
    where: { examId_userId: { examId, userId } },
    update: { source: "MANUAL", locked: true, score: 999 },
    create: { examId, userId, source: "MANUAL", locked: true, score: 999, scoreDetails: { manual: true } }
  });
  await writeAudit({ actorId: actor.id, action: "ASSIGNMENT_ADDED", entity: "Assignment", entityId: `${examId}:${userId}` });
  revalidatePath("/assignments");
  redirect(`/assignments?year=${encodeURIComponent(exam.academicYear)}&manual=1`);
}

export async function removeAssignment(formData: FormData) {
  const { user: actor } = await requireStaff();
  const id = String(formData.get("id") || "");
  const assignment = await prisma.assignment.findUnique({ where: { id }, include: { exam: true } });
  if (!assignment) return;
  await prisma.assignment.delete({ where: { id } });
  await writeAudit({ actorId: actor.id, action: "ASSIGNMENT_REMOVED", entity: "Assignment", entityId: id });
  revalidatePath("/assignments");
  redirect(`/assignments?year=${encodeURIComponent(assignment.exam.academicYear)}`);
}

export async function toggleAssignmentLock(formData: FormData) {
  const { user: actor } = await requireStaff();
  const id = String(formData.get("id") || "");
  const assignment = await prisma.assignment.findUnique({ where: { id }, include: { exam: true } });
  if (!assignment) return;
  await prisma.assignment.update({ where: { id }, data: { locked: !assignment.locked } });
  await writeAudit({ actorId: actor.id, action: assignment.locked ? "ASSIGNMENT_UNLOCKED" : "ASSIGNMENT_LOCKED", entity: "Assignment", entityId: id });
  revalidatePath("/assignments");
  redirect(`/assignments?year=${encodeURIComponent(assignment.exam.academicYear)}`);
}
