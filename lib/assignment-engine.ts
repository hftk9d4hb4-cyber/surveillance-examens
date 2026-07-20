export type EngineAvailability = "UNAVAILABLE" | "WEAK_AVAILABLE" | "AVAILABLE" | "STRONG_AVAILABLE";

export type EngineTeacher = {
  id: string;
  name: string;
  quotaAnnual: number | null;
  currentLoad: number;
};

export type EngineExam = {
  id: string;
  date: string;
  halfDay: "AM" | "PM";
  requiredSupervisors: number;
};

export type EngineLockedAssignment = {
  examId: string;
  userId: string;
};

export type PlannedAssignment = {
  examId: string;
  userId: string;
  score: number;
  scoreDetails: {
    availability: EngineAvailability | "NO_RESPONSE";
    availabilityPoints: number;
    loadPenalty: number;
    quotaPenalty: number;
    tieBreaker: number;
  };
};

export type AssignmentPlan = {
  assignments: PlannedAssignment[];
  alerts: { examId: string; missing: number; availableCandidates: number }[];
  finalLoads: Record<string, number>;
};

function availabilityPoints(status?: EngineAvailability) {
  switch (status) {
    case "STRONG_AVAILABLE":
      return 120;
    case "AVAILABLE":
      return 85;
    case "WEAK_AVAILABLE":
      return 45;
    case "UNAVAILABLE":
      return Number.NEGATIVE_INFINITY;
    default:
      return 12;
  }
}

function deterministicTieBreaker(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (Math.abs(hash) % 1000) / 1000;
}

export function planAssignments(input: {
  teachers: EngineTeacher[];
  exams: EngineExam[];
  availabilityBySlot: Map<string, EngineAvailability>;
  lockedAssignments: EngineLockedAssignment[];
  maxAssignmentsPerDay?: number;
}): AssignmentPlan {
  const maxPerDay = input.maxAssignmentsPerDay ?? 1;
  const loads = new Map(input.teachers.map((teacher) => [teacher.id, teacher.currentLoad]));
  const occupiedByDay = new Map<string, Map<string, number>>();
  const occupiedSlots = new Set<string>();
  const lockedByExam = new Map<string, Set<string>>();

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
    `${a.date}-${a.halfDay}`.localeCompare(`${b.date}-${b.halfDay}`)
  );

  for (const exam of sortedExams) {
    const lockedCount = lockedByExam.get(exam.id)?.size ?? 0;
    const needed = Math.max(0, exam.requiredSupervisors - lockedCount);
    if (needed === 0) continue;

    const candidates = input.teachers
      .filter((teacher) => {
        const status = input.availabilityBySlot.get(`${teacher.id}|${exam.date}|${exam.halfDay}`);
        if (status === "UNAVAILABLE") return false;
        if (occupiedSlots.has(`${teacher.id}|${exam.date}|${exam.halfDay}`)) return false;
        const dayCount = occupiedByDay.get(teacher.id)?.get(exam.date) ?? 0;
        if (dayCount >= maxPerDay) return false;
        const load = loads.get(teacher.id) ?? 0;
        if (teacher.quotaAnnual && teacher.quotaAnnual > 0 && load >= teacher.quotaAnnual) return false;
        return true;
      })
      .map((teacher) => {
        const status = input.availabilityBySlot.get(`${teacher.id}|${exam.date}|${exam.halfDay}`);
        const availabilityStatus: PlannedAssignment["scoreDetails"]["availability"] =
          status ?? "NO_RESPONSE";
        const availability = availabilityPoints(status);
        const load = loads.get(teacher.id) ?? 0;
        const loadPenalty = load * 18;
        const quotaPenalty = teacher.quotaAnnual && teacher.quotaAnnual > 0
          ? (load / teacher.quotaAnnual) * 35
          : 0;
        const tieBreaker = deterministicTieBreaker(`${exam.id}|${teacher.id}`);
        const score = availability - loadPenalty - quotaPenalty + tieBreaker;
        return {
          teacher,
          score,
          details: {
            availability: availabilityStatus,
            availabilityPoints: availability,
            loadPenalty,
            quotaPenalty,
            tieBreaker
          }
        };
      })
      .sort((a, b) => b.score - a.score || a.teacher.name.localeCompare(b.teacher.name, "fr"));

    const selected = candidates.slice(0, needed);
    if (selected.length < needed) {
      alerts.push({
        examId: exam.id,
        missing: needed - selected.length,
        availableCandidates: candidates.length
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
      occupiedSlots.add(`${candidate.teacher.id}|${exam.date}|${exam.halfDay}`);
      const dayMap = occupiedByDay.get(candidate.teacher.id) ?? new Map<string, number>();
      dayMap.set(exam.date, (dayMap.get(exam.date) ?? 0) + 1);
      occupiedByDay.set(candidate.teacher.id, dayMap);
    }
  }

  return {
    assignments,
    alerts,
    finalLoads: Object.fromEntries(loads)
  };
}
