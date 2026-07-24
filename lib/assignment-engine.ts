export type EngineAvailability = "UNAVAILABLE" | "WEAK_AVAILABLE" | "AVAILABLE" | "STRONG_AVAILABLE";

export type EngineWeights = {
  availability: number;
  quota: number;
  fairness: number;
  recency: number;
  preference: number;
  extraTimeMultiplier: number;
};

export const DEFAULT_ENGINE_WEIGHTS: EngineWeights = {
  availability: 35,
  quota: 25,
  fairness: 20,
  recency: 10,
  preference: 10,
  extraTimeMultiplier: 1.5
};

export type EngineTeacher = {
  id: string;
  name: string;
  quotaAnnual: number | null;
  currentLoad: number;
  weightedLoad?: number;
  lastAssignmentDate?: string | null;
};

export type EngineExam = {
  id: string;
  date: string;
  halfDay: "AM" | "PM";
  requiredSupervisors: number;
  extraTime?: boolean;
};

export type EngineLockedAssignment = { examId: string; userId: string; weight?: number };

export type ScoreDetails = {
  availability: EngineAvailability | "NO_RESPONSE";
  availabilityPoints: number;
  quotaPoints: number;
  fairnessPoints: number;
  recencyPoints: number;
  preferencePoints: number;
  preferenceWeight: number;
  weightedLoadBefore: number;
  assignmentWeight: number;
  tieBreaker: number;
  exclusions: string[];
};

export type PlannedAssignment = {
  examId: string;
  userId: string;
  score: number;
  scoreDetails: ScoreDetails;
};

export type AssignmentAnomaly = {
  type: "UNDERSTAFFED" | "QUOTA_EXCEEDED" | "DOUBLE_ASSIGNMENT" | "ABSENT_ASSIGNED";
  examId?: string;
  userId?: string;
  message: string;
  severity: "warning" | "error";
};

export type AssignmentPlan = {
  assignments: PlannedAssignment[];
  alerts: { examId: string; missing: number; availableCandidates: number }[];
  anomalies: AssignmentAnomaly[];
  finalLoads: Record<string, number>;
  finalWeightedLoads: Record<string, number>;
  fairnessIndex: number;
};

function availabilityRatio(status?: EngineAvailability) {
  if (status === "STRONG_AVAILABLE") return 1;
  if (status === "AVAILABLE") return 0.75;
  if (status === "WEAK_AVAILABLE") return 0.35;
  if (status === "UNAVAILABLE") return -1;
  return 0.15;
}

function deterministicTieBreaker(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (Math.abs(hash) % 1000) / 100000;
}

function daysBetween(earlier: string | null | undefined, later: string) {
  if (!earlier) return 365;
  return Math.max(0, Math.floor((Date.parse(later) - Date.parse(earlier)) / 86_400_000));
}

function fairnessIndex(values: number[]) {
  if (values.length === 0) return 100;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean === 0) return 100;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  const coefficient = Math.sqrt(variance) / mean;
  return Math.max(0, Math.round((1 - Math.min(1, coefficient)) * 100));
}

export function planAssignments(input: {
  teachers: EngineTeacher[];
  exams: EngineExam[];
  availabilityBySlot: Map<string, EngineAvailability>;
  absenceSlots?: Set<string>;
  preferenceBySlot?: Map<string, number>;
  lockedAssignments: EngineLockedAssignment[];
  maxAssignmentsPerDay?: number;
  weights?: EngineWeights;
}): AssignmentPlan {
  const weights = input.weights ?? DEFAULT_ENGINE_WEIGHTS;
  const maxPerDay = input.maxAssignmentsPerDay ?? 1;
  const loads = new Map(input.teachers.map((teacher) => [teacher.id, teacher.currentLoad]));
  const weightedLoads = new Map(input.teachers.map((teacher) => [teacher.id, teacher.weightedLoad ?? teacher.currentLoad]));
  const occupiedByDay = new Map<string, Map<string, number>>();
  const occupiedSlots = new Set<string>();
  const lockedByExam = new Map<string, Set<string>>();
  const anomalies: AssignmentAnomaly[] = [];

  for (const locked of input.lockedAssignments) {
    const exam = input.exams.find((item) => item.id === locked.examId);
    if (!exam) continue;
    const byExam = lockedByExam.get(locked.examId) ?? new Set<string>();
    byExam.add(locked.userId);
    lockedByExam.set(locked.examId, byExam);
    occupiedSlots.add(`${locked.userId}|${exam.date}|${exam.halfDay}`);
    const dayMap = occupiedByDay.get(locked.userId) ?? new Map<string, number>();
    dayMap.set(exam.date, (dayMap.get(exam.date) ?? 0) + 1);
    occupiedByDay.set(locked.userId, dayMap);
  }

  const assignments: PlannedAssignment[] = [];
  const alerts: AssignmentPlan["alerts"] = [];
  const sortedExams = [...input.exams].sort((a, b) =>
    `${a.date}-${a.halfDay}-${a.id}`.localeCompare(`${b.date}-${b.halfDay}-${b.id}`)
  );

  for (const exam of sortedExams) {
    const lockedCount = lockedByExam.get(exam.id)?.size ?? 0;
    const needed = Math.max(0, exam.requiredSupervisors - lockedCount);
    if (needed === 0) continue;
    const assignmentWeight = exam.extraTime ? weights.extraTimeMultiplier : 1;

    const candidates = input.teachers
      .flatMap((teacher) => {
        const slotKey = `${teacher.id}|${exam.date}|${exam.halfDay}`;
        const exclusions: string[] = [];
        const status = input.availabilityBySlot.get(slotKey);

        if (status === "UNAVAILABLE") exclusions.push("INDISPONIBLE");
        if (input.absenceSlots?.has(slotKey)) exclusions.push("ABSENCE");
        if (occupiedSlots.has(slotKey)) exclusions.push("DOUBLE_AFFECTATION");

        const dayCount = occupiedByDay.get(teacher.id)?.get(exam.date) ?? 0;
        if (dayCount >= maxPerDay) exclusions.push("LIMITE_JOURNALIERE");

        const load = loads.get(teacher.id) ?? 0;
        if (teacher.quotaAnnual !== null && load >= teacher.quotaAnnual) {
          exclusions.push("QUOTA_ATTEINT");
        }

        if (exclusions.length > 0) return [];

        const weightedLoad = weightedLoads.get(teacher.id) ?? load;
        const availabilityPoints = availabilityRatio(status) * weights.availability;
        const quotaRatio =
          teacher.quotaAnnual && teacher.quotaAnnual > 0
            ? weightedLoad / teacher.quotaAnnual
            : 0;
        const quotaPoints = Math.max(0, 1 - quotaRatio) * weights.quota;
        const maxLoad = Math.max(1, ...Array.from(weightedLoads.values()));
        const fairnessPoints =
          Math.max(0, 1 - weightedLoad / maxLoad) * weights.fairness;
        const recencyPoints =
          Math.min(1, daysBetween(teacher.lastAssignmentDate, exam.date) / 90) *
          weights.recency;
        const preferenceWeight =
          input.preferenceBySlot?.get(
            `${teacher.id}|${new Date(`${exam.date}T12:00:00Z`).getUTCDay()}|${exam.halfDay}`
          ) ?? 0;
        const preferencePoints =
          Math.max(-1, Math.min(1, preferenceWeight)) * weights.preference;
        const tieBreaker = deterministicTieBreaker(`${exam.id}|${teacher.id}`);
        const score = Math.max(
          0,
          Math.min(
            100,
            availabilityPoints +
              quotaPoints +
              fairnessPoints +
              recencyPoints +
              preferencePoints +
              tieBreaker
          )
        );

        const details: ScoreDetails = {
          availability: status ?? "NO_RESPONSE",
          availabilityPoints,
          quotaPoints,
          fairnessPoints,
          recencyPoints,
          preferencePoints,
          preferenceWeight,
          weightedLoadBefore: weightedLoad,
          assignmentWeight,
          tieBreaker,
          exclusions
        };

        return [{ teacher, score, details }];
      })
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.teacher.name.localeCompare(b.teacher.name, "fr") ||
          a.teacher.id.localeCompare(b.teacher.id)
      );

    const selected = candidates.slice(0, needed);

    if (selected.length < needed) {
      const missing = needed - selected.length;
      alerts.push({
        examId: exam.id,
        missing,
        availableCandidates: candidates.length
      });
      anomalies.push({
        type: "UNDERSTAFFED",
        examId: exam.id,
        message: `${missing} surveillant(s) manquant(s).`,
        severity: "error"
      });
    }

    for (const candidate of selected) {
      assignments.push({
        examId: exam.id,
        userId: candidate.teacher.id,
        score: candidate.score,
        scoreDetails: candidate.details
      });
      loads.set(candidate.teacher.id, (loads.get(candidate.teacher.id) ?? 0) + 1);
      weightedLoads.set(
        candidate.teacher.id,
        (weightedLoads.get(candidate.teacher.id) ?? 0) + assignmentWeight
      );
      occupiedSlots.add(`${candidate.teacher.id}|${exam.date}|${exam.halfDay}`);

      const dayMap =
        occupiedByDay.get(candidate.teacher.id) ?? new Map<string, number>();
      dayMap.set(exam.date, (dayMap.get(exam.date) ?? 0) + 1);
      occupiedByDay.set(candidate.teacher.id, dayMap);
    }
  }

  return {
    assignments,
    alerts,
    anomalies,
    finalLoads: Object.fromEntries(loads),
    finalWeightedLoads: Object.fromEntries(weightedLoads),
    fairnessIndex: fairnessIndex(Array.from(weightedLoads.values()))
  };
}
