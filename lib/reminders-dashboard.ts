import { prisma } from "@/lib/prisma";
import {
  buildReminderRows,
  CAMPAIGN_REMINDER_AUDIT_ACTION,
  type ReminderTeacherRow
} from "@/lib/reminders-dashboard-core";

export type CampaignRemindersDashboard = {
  campaign: {
    id: string;
    name: string;
    academicYear: string;
    promotion: string;
    managerId: string | null;
    startDate: Date;
    endDate: Date;
  };
  rows: ReminderTeacherRow[];
};

export async function loadCampaignReminders(campaignId: string): Promise<CampaignRemindersDashboard | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      name: true,
      academicYear: true,
      promotion: true,
      managerId: true,
      startDate: true,
      endDate: true,
      exams: {
        select: { date: true, halfDay: true },
        orderBy: [{ date: "asc" }, { halfDay: "asc" }]
      }
    }
  });
  if (!campaign) return null;

  const [teachers, availabilities, reminderAudits] = await Promise.all([
    prisma.user.findMany({
      where: { role: "TEACHER" },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        passwordHash: true,
        mustChangePassword: true,
        activationSentAt: true,
        lastLoginAt: true
      },
      orderBy: [{ lastName: "asc" }, { name: "asc" }]
    }),
    prisma.availability.findMany({
      where: {
        date: { gte: campaign.startDate, lte: campaign.endDate }
      },
      select: { userId: true, date: true, halfDay: true }
    }),
    prisma.auditLog.findMany({
      where: {
        action: CAMPAIGN_REMINDER_AUDIT_ACTION,
        entity: "User",
        details: { path: ["campaignId"], equals: campaignId }
      },
      select: { entityId: true, createdAt: true, details: true },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const { exams, ...campaignDetails } = campaign;
  return {
    campaign: campaignDetails,
    rows: buildReminderRows({
      campaignId,
      teachers,
      slots: exams,
      availabilities,
      reminderAudits
    })
  };
}
