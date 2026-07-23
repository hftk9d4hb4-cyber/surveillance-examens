import type { ReminderTeacherRow } from "@/lib/reminders-dashboard-core";

export type CampaignReminderKind = "ACTIVATION" | "AVAILABILITY";
export type ReminderCampaignStatus = "PREPARATION" | "COLLECTING" | "ASSIGNING" | "PUBLISHED" | "CLOSED";

export const REMINDER_BATCH_LIMIT = 50;
export const REMINDER_COOLDOWN_MS = 5 * 60 * 1000;

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
