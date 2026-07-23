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
    status: "PREPARATION" | "COLLECTING" | "ASSIGNING" | "PUBLISHED" | "CLOSED";
    managerId: string | null;
    startDate: Date;
    endDate: Date;
    responseDeadline: Date | null;
  };
  rows: ReminderTeacherRow[];
  history: Array<{
    id: string;
    teacherName: string;
    createdAt: Date;
    kind: string;
    result: "SENT" | "FAILED" | "SKIPPED";
    actorName: string;
  }>;
};

function detail(details: unknown, key: string) {
  if (!details || typeof details !== "object" || Array.isArray(details) || !(key in details)) return "";
  const value = (details as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

export async function loadCampaignReminders(campaignId: string): Promise<CampaignRemindersDashboard | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      name: true,
      academicYear: true,
      promotion: true,
      status: true,
      managerId: true,
      startDate: true,
      endDate: true,
      responseDeadline: true,
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
        action: {
          in: [
            CAMPAIGN_REMINDER_AUDIT_ACTION,
            "CAMPAIGN_REMINDER_FAILED",
            "CAMPAIGN_REMINDER_SKIPPED"
          ]
        },
        entity: "User",
        details: { path: ["campaignId"], equals: campaignId }
      },
      select: {
        id: true,
        entityId: true,
        action: true,
        createdAt: true,
        details: true,
        actor: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    })
  ]);

  const { exams, ...campaignDetails } = campaign;
  const teacherNames = new Map(teachers.map((teacher) => [teacher.id, teacher.name]));
  return {
    campaign: campaignDetails,
    rows: buildReminderRows({
      campaignId,
      teachers,
      slots: exams,
      availabilities,
      reminderAudits: reminderAudits.filter((event) => event.action === CAMPAIGN_REMINDER_AUDIT_ACTION)
    }),
    history: reminderAudits.map((event) => ({
      id: event.id,
      teacherName: event.entityId ? teacherNames.get(event.entityId) ?? "Enseignant inconnu" : "Enseignant inconnu",
      createdAt: event.createdAt,
      kind: detail(event.details, "kind") || "—",
      result: event.action === CAMPAIGN_REMINDER_AUDIT_ACTION
        ? "SENT"
        : event.action === "CAMPAIGN_REMINDER_FAILED"
          ? "FAILED"
          : "SKIPPED",
      actorName: event.actor?.name ?? "Système"
    }))
  };
}
