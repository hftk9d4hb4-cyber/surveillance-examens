import type { ReminderTeacherRow } from "@/lib/reminders-dashboard-core";

export type CampaignReminderKind = "ACTIVATION" | "AVAILABILITY";
export type ReminderCampaignStatus = "PREPARATION" | "COLLECTING" | "ASSIGNING" | "PUBLISHED" | "CLOSED";

export const REMINDER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export function reminderKindFor(
  row: Pick<ReminderTeacherRow, "activationStatus" | "availabilityProgress" | "overallStatus">,
  campaignStatus: ReminderCampaignStatus
): CampaignReminderKind | null {
  if (campaignStatus === "CLOSED" || row.overallStatus === "INACTIVE" || row.overallStatus === "COMPLETE") {
    return null;
  }
  if (row.activationStatus !== "ACTIVATED") return "ACTIVATION";
  if (
    (campaignStatus === "COLLECTING" || campaignStatus === "ASSIGNING") &&
    row.availabilityProgress !== "COMPLETE"
  ) {
    return "AVAILABILITY";
  }
  return null;
}

export function reminderCooldownStart(now = new Date()) {
  return new Date(now.getTime() - REMINDER_COOLDOWN_MS);
}

export function nextReminderAt(lastReminderAt: Date) {
  return new Date(lastReminderAt.getTime() + REMINDER_COOLDOWN_MS);
}

export function canSendReminderAt(lastReminderAt: Date | null, now = new Date()) {
  return !lastReminderAt || nextReminderAt(lastReminderAt) <= now;
}
