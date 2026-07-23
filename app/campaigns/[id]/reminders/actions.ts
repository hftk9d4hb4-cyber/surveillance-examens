"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import { canAccessCampaign } from "@/lib/campaign-access";
import { requireStaff } from "@/lib/guards";
import { sendActivationMail, sendAvailabilityReminderMail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import {
  REMINDER_BATCH_LIMIT,
  reminderCooldownStart,
  reminderKindFor
} from "@/lib/reminder-policy";
import { loadCampaignReminders } from "@/lib/reminders-dashboard";
import { CAMPAIGN_REMINDER_AUDIT_ACTION } from "@/lib/reminders-dashboard-core";
import { createActivationToken } from "@/lib/tokens";

function remindersUrl(campaignId: string, params: Record<string, number | string>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) search.set(key, String(value));
  return `/campaigns/${campaignId}/reminders?${search}`;
}

export async function sendCampaignReminders(formData: FormData) {
  const campaignId = String(formData.get("campaignId") || "");
  if (!campaignId) redirect("/campaigns?error=not-found");

  const { user: actor } = await requireStaff();
  const dashboard = await loadCampaignReminders(campaignId);
  if (!dashboard) redirect("/campaigns?error=not-found");
  if (!canAccessCampaign(dashboard.campaign.managerId, actor)) redirect("/campaigns?error=access");

  const singleUserId = String(formData.get("singleUserId") || "");
  const requestedIds = singleUserId
    ? [singleUserId]
    : formData.getAll("userId").map(String).filter(Boolean);
  const userIds = [...new Set(requestedIds)];
  if (userIds.length === 0) redirect(remindersUrl(campaignId, { error: "selection" }));
  if (userIds.length > REMINDER_BATCH_LIMIT) redirect(remindersUrl(campaignId, { error: "limit" }));

  const rowsById = new Map(dashboard.rows.map((row) => [row.id, row]));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, role: "TEACHER", isActive: true }
  });
  const usersById = new Map(users.map((user) => [user.id, user]));
  const recentReminders = await prisma.auditLog.findMany({
    where: {
      action: CAMPAIGN_REMINDER_AUDIT_ACTION,
      entity: "User",
      entityId: { in: userIds },
      createdAt: { gte: reminderCooldownStart() },
      details: { path: ["campaignId"], equals: campaignId }
    },
    select: { entityId: true }
  });
  const coolingDown = new Set(recentReminders.map((event) => event.entityId).filter(Boolean));

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const userId of userIds) {
    const row = rowsById.get(userId);
    const user = usersById.get(userId);
    const kind = row ? reminderKindFor(row, dashboard.campaign.status) : null;
    if (!row || !user || !kind || coolingDown.has(userId)) {
      await writeAudit({
        actorId: actor.id,
        action: "CAMPAIGN_REMINDER_SKIPPED",
        entity: "User",
        entityId: userId,
        details: {
          campaignId,
          kind: kind ?? "NONE",
          result: "SKIPPED",
          reason: coolingDown.has(userId) ? "COOLDOWN" : "NOT_ELIGIBLE"
        }
      });
      skipped += 1;
      continue;
    }

    try {
      if (kind === "ACTIVATION") {
        const { token } = await createActivationToken(user.id);
        await sendActivationMail(user, token);
        await prisma.user.update({ where: { id: user.id }, data: { activationSentAt: new Date() } });
      } else {
        await sendAvailabilityReminderMail(user, dashboard.campaign);
      }

      await writeAudit({
        actorId: actor.id,
        action: CAMPAIGN_REMINDER_AUDIT_ACTION,
        entity: "User",
        entityId: user.id,
        details: { campaignId, kind, result: "SENT" }
      });
      sent += 1;
    } catch (error) {
      await writeAudit({
        actorId: actor.id,
        action: "CAMPAIGN_REMINDER_FAILED",
        entity: "User",
        entityId: user.id,
        details: {
          campaignId,
          kind,
          result: "FAILED",
          errorType: error instanceof Error ? error.name : "UnknownError"
        }
      });
      failed += 1;
    }
  }

  await writeAudit({
    actorId: actor.id,
    action: "CAMPAIGN_REMINDER_BATCH_COMPLETED",
    entity: "Campaign",
    entityId: campaignId,
    details: { requested: userIds.length, sent, failed, skipped, mode: singleUserId ? "SINGLE" : "SELECTION" }
  });

  revalidatePath(`/campaigns/${campaignId}/reminders`);
  redirect(remindersUrl(campaignId, { sent, failed, skipped }));
}
