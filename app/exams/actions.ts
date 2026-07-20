"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ExamStatus, HalfDay } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { academicYearForDate } from "@/lib/format";
import { writeAudit } from "@/lib/audit";

const examSchema = z.object({
  title: z.string().min(2).max(180),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  halfDay: z.enum(["AM", "PM"]),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  promotion: z.string().min(1).max(120),
  location: z.string().min(1).max(180),
  requiredSupervisors: z.coerce.number().int().min(1).max(200),
  notes: z.string().max(2000).optional()
});

export async function createExam(formData: FormData) {
  const { user } = await requireStaff();
  const parsed = examSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/exams?error=validation");
  const date = new Date(`${parsed.data.date}T00:00:00.000Z`);
  const exam = await prisma.exam.create({
    data: {
      title: parsed.data.title,
      date,
      halfDay: parsed.data.halfDay as HalfDay,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      academicYear: academicYearForDate(date),
      promotion: parsed.data.promotion,
      location: parsed.data.location,
      requiredSupervisors: parsed.data.requiredSupervisors,
      notes: parsed.data.notes || null,
      status: "PUBLISHED"
    }
  });
  await writeAudit({ actorId: user.id, action: "EXAM_CREATED", entity: "Exam", entityId: exam.id });
  revalidatePath("/exams");
  redirect("/exams?created=1");
}

export async function setExamStatus(formData: FormData) {
  const { user } = await requireStaff();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "") as ExamStatus;
  if (!id || !["DRAFT", "PUBLISHED", "CANCELLED"].includes(status)) return;
  await prisma.exam.update({ where: { id }, data: { status } });
  await writeAudit({ actorId: user.id, action: "EXAM_STATUS_UPDATED", entity: "Exam", entityId: id, details: { status } });
  revalidatePath("/exams");
}

export async function deleteExam(formData: FormData) {
  const { user } = await requireStaff();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.exam.delete({ where: { id } });
  await writeAudit({ actorId: user.id, action: "EXAM_DELETED", entity: "Exam", entityId: id });
  revalidatePath("/exams");
}
