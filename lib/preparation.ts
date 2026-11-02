import { prisma } from "@/lib/prisma";
import { buildPreparationReport } from "./preparation-core";
import { todayInTimeZone } from "./time";

export async function loadPreparationData(scope: { academicYear: string; campaignId?: string; examId?: string; futureOnly?: boolean; managerId?: string }) {
  const exams = await prisma.exam.findMany({
    where: { ...(scope.managerId ? { OR: [{ campaignId: null }, { campaign: { managerId: null } }, { campaign: { managerId: scope.managerId } }] } : {}), academicYear: scope.academicYear, status: "PUBLISHED", ...(scope.campaignId ? { campaignId: scope.campaignId } : {}), ...(scope.examId ? { id: scope.examId } : {}), ...(scope.futureOnly ? { date: { gte: todayInTimeZone() } } : {}) },
    include: { assignments: { include: { user: { select: { name: true, role: true, isActive: true, mustChangePassword: true, quotaAnnual: true } }, convocation: { select: { status: true } }, acknowledgement: { select: { acknowledgedAt: true } } } } },
    orderBy: [{ date: "asc" }, { title: "asc" }]
  });
  const dates = [...new Map(exams.map(e => [e.date.toISOString(), e.date])).values()].sort((a, b) => a.getTime() - b.getTime());
  const [teachers, availabilities, absences, other, counts, config] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true, role: "TEACHER" }, select: { id: true } }),
    prisma.availability.findMany({ where: { date: { in: dates } }, select: { userId: true, date: true, halfDay: true, status: true } }),
    dates.length ? prisma.teacherAbsence.findMany({ where: { startDate: { lte: dates[dates.length - 1] }, endDate: { gte: dates[0] } }, select: { userId: true, startDate: true, endDate: true } }) : Promise.resolve([]),
    prisma.assignment.findMany({ where: { exam: { date: { in: dates }, status: "PUBLISHED" } }, select: { id: true, userId: true, examId: true, exam: { select: { date: true, halfDay: true } } } }),
    prisma.assignment.groupBy({ by: ["userId"], where: { exam: { academicYear: scope.academicYear, status: "PUBLISHED" } }, _count: { _all: true } }),
    prisma.assignmentEngineConfig.findUnique({ where: { academicYear: scope.academicYear }, select: { maxAssignmentsPerDay: true } })
  ]);
  return { exams, teachers, availabilities, absences, otherAssignments: other.map(a => ({ ...a, ...a.exam })), annualCounts: new Map(counts.map(c => [c.userId, c._count._all])), maxAssignmentsPerDay: config?.maxAssignmentsPerDay ?? 1 };
}

export async function loadPreparationReport(scope: Parameters<typeof loadPreparationData>[0]) {
  return buildPreparationReport(await loadPreparationData(scope));
}
