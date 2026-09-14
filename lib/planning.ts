export function planningMonth(value: unknown, today: Date) {
  const valid = typeof value === "string" && /^(20\d{2})-(0[1-9]|1[0-2])$/.test(value);
  const key = valid ? value : today.toISOString().slice(0, 7);
  const [year, month] = key.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return {
    key, start, end,
    previous: new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7),
    next: end.toISOString().slice(0, 7),
    offset: (start.getUTCDay() + 6) % 7,
    days: new Date(Date.UTC(year, month, 0)).getUTCDate()
  };
}

export function coverageSummary(exams: { requiredSupervisors: number; _count: { assignments: number } }[]) {
  const required = exams.reduce((sum, exam) => sum + exam.requiredSupervisors, 0);
  const missing = exams.reduce((sum, exam) => sum + Math.max(0, exam.requiredSupervisors - exam._count.assignments), 0);
  return { required, missing, coverage: required ? Math.round((required - missing) / required * 100) : null,
    incomplete: exams.filter(exam => exam._count.assignments < exam.requiredSupervisors).length };
}
