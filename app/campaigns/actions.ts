"use server";

import { Prisma, type CampaignStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import { CAMPAIGN_STATUSES, canTransitionCampaign } from "@/lib/campaigns";
import { requireStaff } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { isValidAcademicYear, parseIsoDate } from "@/lib/validation";

function campaignForm(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const academicYear = String(formData.get("academicYear") || "").trim();
  const promotion = String(formData.get("promotion") || "").trim();
  const startDate = parseIsoDate(String(formData.get("startDate") || ""));
  const endDate = parseIsoDate(String(formData.get("endDate") || ""));
  const responseDeadlineRaw = String(formData.get("responseDeadline") || "");
  const responseDeadline = responseDeadlineRaw ? parseIsoDate(responseDeadlineRaw) : null;
  const managerId = String(formData.get("managerId") || "") || null;

  if (
    name.length < 2 || name.length > 120 ||
    !isValidAcademicYear(academicYear) ||
    promotion.length < 1 || promotion.length > 120 ||
    !startDate || !endDate || startDate > endDate ||
    (responseDeadlineRaw && !responseDeadline) ||
    (responseDeadline && responseDeadline > startDate)
  ) return null;

  return { name, academicYear, promotion, startDate, endDate, responseDeadline, managerId };
}

async function validManager(managerId: string | null) {
  if (!managerId) return true;
  return Boolean(await prisma.user.findFirst({
    where: { id: managerId, isActive: true, role: { in: ["MANAGER", "ADMIN"] } },
    select: { id: true }
  }));
}

function refresh() {
  revalidatePath("/campaigns");
  revalidatePath("/exams");
  revalidatePath("/dashboard");
}

export async function createCampaign(formData: FormData) {
  const { user: actor } = await requireStaff();
  const data = campaignForm(formData);
  if (!data) redirect("/campaigns?error=validation");
  if (!(await validManager(data.managerId))) redirect("/campaigns?error=manager");

  try {
    const campaign = await prisma.campaign.create({ data: { ...data, status: "PREPARATION" } });
    await writeAudit({
      actorId: actor.id,
      action: "CAMPAIGN_CREATED",
      entity: "Campaign",
      entityId: campaign.id,
      details: { academicYear: data.academicYear, promotion: data.promotion, managerId: data.managerId }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/campaigns?error=duplicate");
    }
    throw error;
  }
  refresh();
  redirect("/campaigns?created=1");
}

export async function updateCampaign(formData: FormData) {
  const { user: actor } = await requireStaff();
  const id = String(formData.get("id") || "");
  const data = campaignForm(formData);
  if (!id || !data) redirect("/campaigns?error=validation");
  if (!(await validManager(data.managerId))) redirect("/campaigns?error=manager");

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { exams: { select: { date: true } } }
  });
  if (!campaign) redirect("/campaigns?error=not-found");
  if (campaign.status === "CLOSED") redirect("/campaigns?error=closed");
  if (campaign.exams.some((exam: { date: Date }) => exam.date < data.startDate || exam.date > data.endDate)) {
    redirect("/campaigns?error=exam-period");
  }

  try {
    await prisma.campaign.update({ where: { id }, data });
    await writeAudit({ actorId: actor.id, action: "CAMPAIGN_UPDATED", entity: "Campaign", entityId: id });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/campaigns?error=duplicate");
    }
    throw error;
  }
  refresh();
  redirect(`/campaigns?updated=${encodeURIComponent(id)}`);
}

export async function updateCampaignStatus(formData: FormData) {
  const { user: actor } = await requireStaff();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "") as CampaignStatus;
  if (!id || !CAMPAIGN_STATUSES.includes(status)) redirect("/campaigns?error=validation");

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { _count: { select: { exams: true } } }
  });
  if (!campaign) redirect("/campaigns?error=not-found");
  if (!canTransitionCampaign(campaign.status, status)) redirect("/campaigns?error=transition");
  if (["COLLECTING", "ASSIGNING", "PUBLISHED"].includes(status) && campaign._count.exams === 0) {
    redirect("/campaigns?error=empty");
  }

  await prisma.campaign.update({
    where: { id },
    data: {
      status,
      ...(status === "COLLECTING" && !campaign.collectionStartedAt ? { collectionStartedAt: new Date() } : {})
    }
  });
  await writeAudit({
    actorId: actor.id,
    action: "CAMPAIGN_STATUS_UPDATED",
    entity: "Campaign",
    entityId: id,
    details: { from: campaign.status, to: status }
  });
  refresh();
}

export async function deleteCampaign(formData: FormData) {
  const { user: actor } = await requireStaff();
  const id = String(formData.get("id") || "");
  if (!id) return;
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { _count: { select: { exams: true } } }
  });
  if (!campaign) return;
  if (campaign._count.exams > 0) redirect("/campaigns?error=has-exams");
  if (campaign.status !== "PREPARATION" && campaign.status !== "CLOSED") {
    redirect("/campaigns?error=delete-status");
  }
  await prisma.campaign.delete({ where: { id } });
  await writeAudit({ actorId: actor.id, action: "CAMPAIGN_DELETED", entity: "Campaign", entityId: id });
  refresh();
  redirect("/campaigns?deleted=1");
}
