import { teacherDepartmentLabel, type AnnualStatistics } from "./annual-statistics";
export function buildEquityReport(stats: AnnualStatistics) {
  const groups = new Map<string, typeof stats.teacherRows>();
  for (const teacher of stats.teacherRows) {
    const name = teacherDepartmentLabel(teacher.department);
    groups.set(name, [...(groups.get(name) || []), teacher]);
  }
  return [...groups].map(([department, teachers]) => {
    const points = teachers.map(t => t.workloadPoints);
    const defined = teachers.filter(t => t.quotaAnnual !== null);
    const positive = teachers.filter(t => t.quotaAnnual !== null && t.quotaAnnual > 0);
    const totalQuota = positive.reduce((sum, t) => sum + t.quotaAnnual!, 0);
    return {
      department, teacherCount: teachers.length,
      assignmentCount: teachers.reduce((sum, t) => sum + t.assignmentCount, 0),
      workloadPoints: points.reduce((sum, value) => sum + value, 0),
      averagePoints: points.reduce((sum, value) => sum + value, 0) / teachers.length,
      minPoints: Math.min(...points), maxPoints: Math.max(...points),
      quotaMissing: teachers.length - defined.length,
      overQuota: defined.filter(t => t.assignmentCount > t.quotaAnnual!).length,
      atQuota: defined.filter(t => t.assignmentCount === t.quotaAnnual!).length,
      underQuota: defined.filter(t => t.assignmentCount < t.quotaAnnual!).length,
      quotaUsePercent: totalQuota ? Math.round(100 * positive.reduce((sum, t) => sum + t.assignmentCount, 0) / totalQuota) : null,
      zeroQuota: defined.filter(t => t.quotaAnnual === 0).length
    };
  }).sort((a, b) => a.department.localeCompare(b.department, "fr"));
}
