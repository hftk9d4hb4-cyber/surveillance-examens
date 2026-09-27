export type AnnualExam = {
  id: string;
  requiredSupervisors: number;
  assignments: Array<{ userId: string; scoreDetails: unknown }>;
};

export type AnnualTeacher = {
  id: string;
  name: string;
  department: string | null;
  quotaAnnual: number | null;
};

export type AnnualStatistics = ReturnType<typeof buildAnnualStatistics>;

function assignmentWeight(details: unknown) {
  if (details && typeof details === "object" && "assignmentWeight" in details) {
    const value = (details as { assignmentWeight?: unknown }).assignmentWeight;
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  }
  return 1;
}

export function buildAnnualStatistics(exams: AnnualExam[], teachers: AnnualTeacher[]) {
  const byTeacher = new Map(teachers.map((teacher) => [teacher.id, {
    ...teacher,
    assignmentCount: 0,
    workloadPoints: 0
  }]));
  let requiredPosts = 0;
  let assignedPosts = 0;
  let totalAssignments = 0;
  for (const exam of exams) {
    requiredPosts += exam.requiredSupervisors;
    assignedPosts += Math.min(exam.assignments.length, exam.requiredSupervisors);
    totalAssignments += exam.assignments.length;
    for (const assignment of exam.assignments) {
      const teacher = byTeacher.get(assignment.userId);
      if (!teacher) continue;
      teacher.assignmentCount += 1;
      teacher.workloadPoints += assignmentWeight(assignment.scoreDetails);
    }
  }
  const teacherRows = [...byTeacher.values()].sort((a, b) => b.workloadPoints - a.workloadPoints || a.name.localeCompare(b.name, "fr"));
  const departmentMap = new Map<string, { department: string; teacherCount: number; assignmentCount: number; workloadPoints: number }>();
  for (const teacher of teacherRows) {
    const department = teacher.department?.trim() || "Service non renseigné";
    const row = departmentMap.get(department) ?? { department, teacherCount: 0, assignmentCount: 0, workloadPoints: 0 };
    row.teacherCount += 1;
    row.assignmentCount += teacher.assignmentCount;
    row.workloadPoints += teacher.workloadPoints;
    departmentMap.set(department, row);
  }
  const departments = [...departmentMap.values()].sort((a, b) => b.workloadPoints - a.workloadPoints || a.department.localeCompare(b.department, "fr"));
  return {
    examCount: exams.length,
    requiredPosts,
    assignedPosts,
    missingPosts: Math.max(0, requiredPosts - assignedPosts),
    coveragePercent: requiredPosts ? Math.round((assignedPosts / requiredPosts) * 100) : null,
    totalAssignments,
    teacherRows,
    departments
  };
}
