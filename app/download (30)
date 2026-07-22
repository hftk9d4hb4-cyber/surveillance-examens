"use server";

import { Prisma, type ExamStatus, type HalfDay } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import { campaignContainsDate } from "@/lib/campaigns";
import { academicYearForDate } from "@/lib/format";
import { requireStaff } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { isChronologicalTimeRange, parseIsoDate, TIME_PATTERN } from "@/lib/validation";

function readExamForm(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const date = parseIsoDate(String(formData.get("date") || ""));
  const halfDay = String(formData.get("halfDay") || "");
  const startTime = String(formData.get("startTime") || "");
  const endTime = String(formData.get("endTime") || "");
  const promotion = String(formData.get("promotion") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const campaignId = String(formData.get("campaignId") || "") || null;
  const requiredSupervisors = Number(formData.get("requiredSupervisors"));
  if (
    title.length < 2 || title.length > 180 || !date || !["AM", "PM"].includes(halfDay) ||
    !TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime) || !isChronologicalTimeRange(startTime, endTime) ||
    !promotion || promotion.length > 120 || !location || location.length > 180 || notes.length > 2000 ||
    !Number.isInteger(requiredSupervisors) || requiredSupervisors < 1 || requiredSupervisors > 200
  ) return null;
  return { title, date, halfDay: halfDay as HalfDay, startTime, endTime, promotion, location, notes, campaignId, requiredSupervisors };
}

async function validateCampaign(campaignId: string | null, date: Date, promotion: string) {
  if (!campaignId) return true;
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  return Boolean(
    campaign && campaign.status !== "CLOSED" && campaign.promotion === promotion &&
    campaignContainsDate(campaign.startDate, campaign.endDate, date)
  );
}

export async function createExam(formData: FormData) {
  const { user } = await requireStaff();
  const data = readExamForm(formData);
  if (!data) redirect("/exams?error=validation");
  if (!(await validateCampaign(data.campaignId, data.date, data.promotion))) redirect("/exams?error=campaign");
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
        campaignId: data.campaignId,
        status: "PUBLISHED"
      }
    });
    await writeAudit({ actorId: user.id, action: "EXAM_CREATED", entity: "Exam", entityId: exam.id, details: { campaignId: data.campaignId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") redirect("/exams?error=duplicate");
    throw error;
  }
  revalidatePath("/exams");
  revalidatePath("/campaigns");
  redirect("/exams?created=1");
}

export async function updateExamCampaign(formData: FormData) {
  const { user } = await requireStaff();
  const id = String(formData.get("id") || "");
  const campaignId = String(formData.get("campaignId") || "") || null;
  if (!id) return;
  const exam = await prisma.exam.findUnique({ where: { id } });
  if (!exam) return;
  if (!(await validateCampaign(campaignId, exam.date, exam.promotion))) redirect("/exams?error=campaign");
  await prisma.exam.update({ where: { id }, data: { campaignId } });
  await writeAudit({ actorId: user.id, action: "EXAM_CAMPAIGN_UPDATED", entity: "Exam", entityId: id, details: { campaignId } });
  revalidatePath("/exams");
  revalidatePath("/campaigns");
}

export async function setExamStatus(formData: FormData) {
  const { user } = await requireStaff();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "") as ExamStatus;
  if (!id || !["DRAFT", "PUBLISHED", "CANCELLED"].includes(status)) return;
  if (status !== "PUBLISHED") {
    const sentConvocation = await prisma.convocation.findFirst({ where: { examId: id, status: "SENT" }, select: { id: true } });
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
  revalidatePath("/campaigns");
}
