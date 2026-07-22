import { prisma } from "@/lib/prisma";
import { calculateCampaignKpis, detectCampaignAlerts, type CampaignSnapshot } from "@/lib/campaign-dashboard-core";

export { calculateCampaignKpis, detectCampaignAlerts } from "@/lib/campaign-dashboard-core";
export type { CampaignKpis, CampaignSnapshot, CandidateAlert } from "@/lib/campaign-dashboard-core";

export async function loadCampaignSnapshot(campaignId: string): Promise<CampaignSnapshot | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true, name: true, academicYear: true, promotion: true, status: true,
      startDate: true, endDate: true, responseDeadline: true,
      exams: {
        orderBy: [{ date: "asc" }, { halfDay: "asc" }],
        select: {
          id: true, title: true, date: true, halfDay: true, requiredSupervisors: true, notes: true,
          assignments: {
            select: {
              id: true, userId: true,
              user: { select: { id: true, name: true, quotaAnnual: true } },
              convocation: { select: { status: true } }
            }
          }
        }
      }
    }
  });
  if (!campaign) return null;

  const [teachers, availabilities, absences, annualAssignments] = await Promise.all([
    prisma.user.findMany({
      where: { role: "TEACHER", isActive: true },
      select: { id: true, name: true, quotaAnnual: true },
      orderBy: { name: "asc" }
    }),
    prisma.availability.findMany({
      where: { date: { gte: campaign.startDate, lte: campaign.endDate } },
      select: { userId: true, date: true, halfDay: true, status: true }
    }),
    prisma.teacherAbsence.findMany({
      where: { startDate: { lte: campaign.endDate }, endDate: { gte: campaign.startDate } },
      select: { userId: true, startDate: true, endDate: true }
    }),
    prisma.assignment.groupBy({
      by: ["userId"],
      where: { exam: { academicYear: campaign.academicYear } },
      _count: { _all: true }
    })
  ]);

  return {
    campaign,
    exams: campaign.exams,
    teachers,
    availabilities,
    absences,
    annualAssignmentCounts: new Map(annualAssignments.map((row) => [row.userId, row._count._all]))
  };
}

export async function synchronizeCampaignAlerts(campaignId: string) {
  const snapshot = await loadCampaignSnapshot(campaignId);
  if (!snapshot) return null;
  const detected = detectCampaignAlerts(snapshot);
  const fingerprints = detected.map((alert) => alert.fingerprint);

  await prisma.$transaction(async (tx) => {
    for (const alert of detected) {
      await tx.campaignAlert.upsert({
        where: { campaignId_fingerprint: { campaignId, fingerprint: alert.fingerprint } },
        create: { campaignId, ...alert },
        update: { ...alert, resolvedAt: null, resolvedById: null }
      });
    }
    await tx.campaignAlert.updateMany({
      where: { campaignId, resolvedAt: null, ...(fingerprints.length ? { fingerprint: { notIn: fingerprints } } : {}) },
      data: { resolvedAt: new Date() }
    });
  });

  return { snapshot, kpis: calculateCampaignKpis(snapshot), detected };
}
