"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import { synchronizeCampaignAlerts } from "@/lib/campaign-dashboard";
import { requireStaff } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

async function authorizeCampaign(campaignId: string) {
  const { user } = await requireStaff();
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true, managerId: true } });
  if (!campaign) redirect("/campaigns?error=not-found");
  if (user.role !== "ADMIN" && campaign.managerId && campaign.managerId !== user.id) redirect("/campaigns?error=access");
  return user;
}

export async function refreshCampaignAlerts(formData: FormData) {
  const campaignId = String(formData.get("campaignId") || "");
  if (!campaignId) return;
  const actor = await authorizeCampaign(campaignId);
  const result = await synchronizeCampaignAlerts(campaignId);
  await writeAudit({
    actorId: actor.id,
    action: "CAMPAIGN_ALERTS_REFRESHED",
    entity: "Campaign",
    entityId: campaignId,
    details: { activeAlerts: result?.detected.length ?? 0 }
  });
  revalidatePath(`/campaigns/${campaignId}/dashboard`);
  redirect(`/campaigns/${campaignId}/dashboard?refreshed=1`);
}

export async function resolveCampaignAlert(formData: FormData) {
  const campaignId = String(formData.get("campaignId") || "");
  const alertId = String(formData.get("alertId") || "");
  if (!campaignId || !alertId) return;
  const actor = await authorizeCampaign(campaignId);
  const alert = await prisma.campaignAlert.findFirst({ where: { id: alertId, campaignId }, select: { id: true } });
  if (!alert) return;
  await prisma.campaignAlert.update({ where: { id: alertId }, data: { resolvedAt: new Date(), resolvedById: actor.id } });
  await writeAudit({ actorId: actor.id, action: "CAMPAIGN_ALERT_RESOLVED", entity: "CampaignAlert", entityId: alertId, details: { campaignId } });
  revalidatePath(`/campaigns/${campaignId}/dashboard`);
}
