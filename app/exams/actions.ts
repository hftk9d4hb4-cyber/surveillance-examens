"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ExamStatus, HalfDay } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { academicYearForDate } from "@/lib/format";
import { writeAudit } from "@/lib/audit";
import { isChronologicalTimeRange, parseIsoDate, TIME_PATTERN } from "@/lib/validation";

function readExamForm(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const dateText = String(formData.get("date") || "");
  const halfDay = String(formData.get("halfDay") || "");
  const startTime = String(formData.get("startTime") || "");
  const endTime = String(formData.get("endTime") || "");
  const promotion = String(formData.get("promotion") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const requiredSupervisors = Number(formData.get("requiredSupervisors"));
  const date = parseIsoDate(dateText);
  if (
    title.length < 2 || title.length > 180 || !date || !["AM", "PM"].includes(halfDay) ||
    !TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime) || !isChronologicalTimeRange(startTime, endTime) ||
    !promotion || promotion.length > 120 || !location || location.length > 180 || notes.length > 2000 ||
    !Number.isInteger(requiredSupervisors) || requiredSupervisors < 1 || requiredSupervisors > 200
  ) return null;
  return { title, date, halfDay: halfDay as HalfDay, startTime, endTime, promotion, location, notes, requiredSupervisors };
}

export async function createExam(formData: FormData) {
  const { user } = await requireStaff();
  const data = readExamForm(formData);
  if (!data) redirect("/exams?error=validation");
  try {
    const exam = await prisma.exam.create({
      data: {
        title: data.title,
        date: data.date,
        halfDay: data.halfDay,
        startTime: data.startTime,
        endTime: data.endTime,
        academicYear: academicYearForDate(data.date),
        promotion: data.promotion,
        location: data.location,
        requiredSupervisors: data.requiredSupervisors,
        notes: data.notes || null,
        status: "PUBLISHED"
      }
    });
    await writeAudit({ actorId: user.id, action: "EXAM_CREATED", entity: "Exam", entityId: exam.id });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") redirect("/exams?error=duplicate");
    throw error;
  }
  revalidatePath("/exams");
  redirect("/exams?created=1");
}

export async function setExamStatus(formData: FormData) {
  const { user } = await requireStaff();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "") as ExamStatus;
  if (!id || !["DRAFT", "PUBLISHED", "CANCELLED"].includes(status)) return;
  if (status !== "PUBLISHED") {
    const sentConvocation = await prisma.convocation.findFirst({
      where: { examId: id, status: "SENT" },
      select: { id: true }
    });
    if (sentConvocation) redirect("/exams?error=notified");
  }
  await prisma.exam.update({ where: { id }, data: { status } });
  await writeAudit({ actorId: user.id, action: "EXAM_STATUS_UPDATED", entity: "Exam", entityId: id, details: { status } });
  revalidatePath("/exams");
}

export async function deleteExam(formData: FormData) {
  const { user } = await requireStaff();
  const id = String(formData.get("id") || "");
  if (!id) return;
  const exam = await prisma.exam.findUnique({ where: { id }, include: { _count: { select: { assignments: true } } } });
  if (!exam) return;
  if (exam._count.assignments > 0) redirect("/exams?error=assigned");
  await prisma.exam.delete({ where: { id } });
  await writeAudit({ actorId: user.id, action: "EXAM_DELETED", entity: "Exam", entityId: id });
  revalidatePath("/exams");
}
