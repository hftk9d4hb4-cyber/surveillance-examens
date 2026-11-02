export type PreparationAssignment = {
  id: string; userId: string;
  user: { name: string; role: string; isActive: boolean; mustChangePassword: boolean; quotaAnnual: number | null };
  convocation: { status: string } | null;
  acknowledgement: { acknowledgedAt: Date } | null;
};
export type PreparationExam = {
  id: string; title: string; date: Date; halfDay: string; requiredSupervisors: number;
  assignments: PreparationAssignment[];
};
export type PreparationIssue = { severity: "BLOCKER" | "WARNING"; code: string; message: string; examId?: string; userId?: string };
export type PreparationInput = {
  exams: PreparationExam[];
  teachers: { id: string }[];
  availabilities: { userId: string; date: Date; halfDay: string; status: string }[];
  absences: { userId: string; startDate: Date; endDate: Date }[];
  otherAssignments: { id: string; userId: string; examId: string; date: Date; halfDay: string }[];
  annualCounts: Map<string, number>;
  maxAssignmentsPerDay: number;
};
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const slot = (date: Date, halfDay: string) => `${dateKey(date)}:${halfDay}`;

export function buildPreparationReport(input: PreparationInput) {
  const issues: PreparationIssue[] = [];
  const availability = new Map(input.availabilities.map(a => [`${a.userId}:${slot(a.date, a.halfDay)}`, a.status]));
  const expected = new Set(input.exams.map(e => slot(e.date, e.halfDay)));
  const missingAvailability = input.teachers.filter(t => [...expected].some(s => !availability.has(`${t.id}:${s}`))).length;
  const allAssignments = [...input.otherAssignments, ...input.exams.flatMap(e => e.assignments.map(a => ({ id: a.id, userId: a.userId, examId: e.id, date: e.date, halfDay: e.halfDay })))];
  const uniqueAssignments = [...new Map(allAssignments.map(a => [a.id, a])).values()];
  const daily = new Map<string, Set<string>>();
  const slots = new Map<string, Set<string>>();
  for (const a of uniqueAssignments) {
    const day = `${a.userId}:${dateKey(a.date)}`;
    const key = `${a.userId}:${slot(a.date, a.halfDay)}`;
    daily.set(day, (daily.get(day) || new Set()).add(a.examId));
    slots.set(key, (slots.get(key) || new Set()).add(a.examId));
  }
  let missingPosts = 0, pendingConvocations = 0, failedConvocations = 0, pendingAcknowledgements = 0;
  const quotaChecked = new Set<string>();
  if (!input.exams.length) issues.push({ severity: "BLOCKER", code: "EMPTY", message: "Aucun examen publié dans ce périmètre." });
  for (const e of input.exams) {
    const eligible = e.assignments.filter(a => a.user.isActive && a.user.role === "TEACHER");
    const missing = Math.max(0, e.requiredSupervisors - eligible.length);
    missingPosts += missing;
    if (missing) issues.push({ severity: "BLOCKER", code: "UNDERSTAFFED", examId: e.id, message: `${e.title} : ${missing} poste(s) à pourvoir.` });
    for (const a of e.assignments) {
      const context = { examId: e.id, userId: a.userId };
      if (!a.user.isActive || a.user.role !== "TEACHER") issues.push({ ...context, severity: "BLOCKER", code: "INACTIVE", message: `${e.title} : ${a.user.name} ne dispose pas d’un compte enseignant actif.` });
      const absent = input.absences.some(x => x.userId === a.userId && x.startDate <= e.date && x.endDate >= e.date);
      const status = availability.get(`${a.userId}:${slot(e.date, e.halfDay)}`);
      if (absent || status === "UNAVAILABLE") issues.push({ ...context, severity: "BLOCKER", code: "UNAVAILABLE", message: `${e.title} : ${a.user.name} est indisponible.` });
      else if (!status) issues.push({ ...context, severity: "WARNING", code: "NO_RESPONSE", message: `${e.title} : disponibilité non renseignée pour ${a.user.name}.` });
      if ((slots.get(`${a.userId}:${slot(e.date, e.halfDay)}`)?.size || 0) > 1) issues.push({ ...context, severity: "BLOCKER", code: "CONFLICT", message: `${e.title} : ${a.user.name} est affecté sur plusieurs examens de la même demi-journée, y compris hors campagne.` });
      else if ((daily.get(`${a.userId}:${dateKey(e.date)}`)?.size || 0) > input.maxAssignmentsPerDay) issues.push({ ...context, severity: "BLOCKER", code: "DAY_LIMIT", message: `${e.title} : limite quotidienne dépassée pour ${a.user.name}.` });
      if (a.user.mustChangePassword) issues.push({ ...context, severity: "WARNING", code: "ACTIVATION", message: `${e.title} : le compte de ${a.user.name} reste à activer.` });
      if (!quotaChecked.has(a.userId) && a.user.quotaAnnual !== null && (input.annualCounts.get(a.userId) || 0) > a.user.quotaAnnual) issues.push({ ...context, severity: "WARNING", code: "QUOTA", message: `${a.user.name} dépasse son quota annuel (${input.annualCounts.get(a.userId)}/${a.user.quotaAnnual}).` });
      quotaChecked.add(a.userId);
      if (a.convocation?.status !== "SENT") pendingConvocations++;
      if (a.convocation?.status === "ERROR") failedConvocations++;
      if (a.convocation?.status === "SENT" && !a.acknowledgement) pendingAcknowledgements++;
    }
  }
  const blockers = issues.filter(i => i.severity === "BLOCKER");
  const warnings = issues.filter(i => i.severity === "WARNING");
  return { examCount: input.exams.length, missingPosts, missingAvailability, pendingConvocations, failedConvocations, pendingAcknowledgements, issues, blockers, warnings, ready: blockers.length === 0 };
}
