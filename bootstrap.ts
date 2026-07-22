type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";
type AlertType = "MISSING_AVAILABILITY" | "UNDERSTAFFED_EXAM" | "DOUBLE_ASSIGNMENT" | "UNAVAILABLE_TEACHER" | "QUOTA_EXCEEDED" | "EXTRA_TIME_UNDERSTAFFED" | "DATA_QUALITY";
type AvailabilityStatus = "UNAVAILABLE" | "WEAK_AVAILABLE" | "AVAILABLE" | "STRONG_AVAILABLE";
type CampaignStatus = "PREPARATION" | "COLLECTING" | "ASSIGNING" | "PUBLISHED" | "CLOSED";
type HalfDay = "AM" | "PM";

function isExtraTimeExam(title: string, notes?: string | null) {
  return /tiers?[- ]?temps|temps major[ée]|am[ée]nagement/i.test(`${title} ${notes ?? ""}`);
}

export type CandidateAlert = {
  fingerprint: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  resolutionUrl?: string;
};

export type CampaignSnapshot = {
  campaign: {
    id: string;
    name: string;
    academicYear: string;
    promotion: string;
    status: CampaignStatus;
    startDate: Date;
    endDate: Date;
    responseDeadline: Date | null;
  };
  exams: Array<{
    id: string;
    title: string;
    date: Date;
    halfDay: HalfDay;
    requiredSupervisors: number;
    notes: string | null;
    assignments: Array<{
      id: string;
      userId: string;
      user: { id: string; name: string; quotaAnnual: number | null };
      convocation: { status: string } | null;
    }>;
  }>;
  teachers: Array<{ id: string; name: string; quotaAnnual: number | null }>;
  availabilities: Array<{ userId: string; date: Date; halfDay: HalfDay; status: AvailabilityStatus }>;
  absences: Array<{ userId: string; startDate: Date; endDate: Date }>;
  annualAssignmentCounts: Map<string, number>;
};

export type CampaignKpis = {
  exams: number;
  requiredPosts: number;
  assignedPosts: number;
  sentConvocations: number;
  respondingTeachers: number;
  totalTeachers: number;
  missingAvailability: number;
  coveragePercent: number;
  availabilityPercent: number;
  convocationPercent: number;
  progressPercent: number;
};

function availabilityKey(userId: string, date: Date, halfDay: HalfDay) {
  return `${userId}:${date.toISOString().slice(0, 10)}:${halfDay}`;
}

export function calculateCampaignKpis(snapshot: CampaignSnapshot): CampaignKpis {
  const requiredPosts = snapshot.exams.reduce((sum, exam) => sum + exam.requiredSupervisors, 0);
  const assignedPosts = snapshot.exams.reduce((sum, exam) => sum + exam.assignments.length, 0);
  const sentConvocations = snapshot.exams.reduce(
    (sum, exam) => sum + exam.assignments.filter((assignment) => assignment.convocation?.status === "SENT").length,
    0
  );
  const respondingTeachers = new Set(snapshot.availabilities.map((item) => item.userId)).size;
  const totalTeachers = snapshot.teachers.length;
  const coveragePercent = requiredPosts === 0 ? 0 : Math.min(100, Math.round((assignedPosts / requiredPosts) * 100));
  const availabilityPercent = totalTeachers === 0 ? 0 : Math.min(100, Math.round((respondingTeachers / totalTeachers) * 100));
  const convocationPercent = assignedPosts === 0 ? 0 : Math.min(100, Math.round((sentConvocations / assignedPosts) * 100));
  const statusBase: Record<CampaignStatus, number> = {
    PREPARATION: 5,
    COLLECTING: 20,
    ASSIGNING: 45,
    PUBLISHED: 80,
    CLOSED: 100
  };
  const operational = Math.round((availabilityPercent + coveragePercent + convocationPercent) / 3);
  const progressPercent = snapshot.campaign.status === "CLOSED"
    ? 100
    : Math.min(99, Math.round(statusBase[snapshot.campaign.status] * 0.55 + operational * 0.45));

  return {
    exams: snapshot.exams.length,
    requiredPosts,
    assignedPosts,
    sentConvocations,
    respondingTeachers,
    totalTeachers,
    missingAvailability: Math.max(0, totalTeachers - respondingTeachers),
    coveragePercent,
    availabilityPercent,
    convocationPercent,
    progressPercent
  };
}

export function detectCampaignAlerts(snapshot: CampaignSnapshot): CandidateAlert[] {
  const alerts: CandidateAlert[] = [];
  const availabilityMap = new Map(snapshot.availabilities.map((item) => [availabilityKey(item.userId, item.date, item.halfDay), item.status]));
  const responding = new Set(snapshot.availabilities.map((item) => item.userId));

  for (const teacher of snapshot.teachers) {
    if (!responding.has(teacher.id)) {
      alerts.push({
        fingerprint: `missing-availability:${teacher.id}`,
        type: "MISSING_AVAILABILITY",
        severity: "WARNING",
        title: "Disponibilités manquantes",
        message: `${teacher.name} n’a déclaré aucune disponibilité pour cette campagne.`,
        entityType: "User",
        entityId: teacher.id,
        resolutionUrl: "/teachers"
      });
    }
  }

  const seenSlots = new Map<string, string>();
  for (const exam of snapshot.exams) {
    const shortage = exam.requiredSupervisors - exam.assignments.length;
    if (shortage > 0) {
      const extraTime = isExtraTimeExam(exam.title, exam.notes);
      alerts.push({
        fingerprint: `understaffed:${exam.id}`,
        type: extraTime ? "EXTRA_TIME_UNDERSTAFFED" : "UNDERSTAFFED_EXAM",
        severity: "CRITICAL",
        title: extraTime ? "Tiers-temps sous-doté" : "Examen sous-doté",
        message: `${exam.title} nécessite encore ${shortage} surveillant${shortage > 1 ? "s" : ""}.`,
        entityType: "Exam",
        entityId: exam.id,
        resolutionUrl: "/assignments"
      });
    }

    for (const assignment of exam.assignments) {
      const slot = `${assignment.userId}:${exam.date.toISOString().slice(0, 10)}:${exam.halfDay}`;
      const previousExamId = seenSlots.get(slot);
      if (previousExamId && previousExamId !== exam.id) {
        alerts.push({
          fingerprint: `double:${slot}`,
          type: "DOUBLE_ASSIGNMENT",
          severity: "CRITICAL",
          title: "Double affectation",
          message: `${assignment.user.name} est affecté à plusieurs examens sur la même demi-journée.`,
          entityType: "User",
          entityId: assignment.userId,
          resolutionUrl: "/assignments"
        });
      } else {
        seenSlots.set(slot, exam.id);
      }

      const status = availabilityMap.get(availabilityKey(assignment.userId, exam.date, exam.halfDay));
      const absent = snapshot.absences.some((absence) => absence.userId === assignment.userId && exam.date >= absence.startDate && exam.date <= absence.endDate);
      if (status === "UNAVAILABLE" || absent) {
        alerts.push({
          fingerprint: `unavailable:${exam.id}:${assignment.userId}`,
          type: "UNAVAILABLE_TEACHER",
          severity: "CRITICAL",
          title: "Enseignant indisponible affecté",
          message: `${assignment.user.name} est affecté à ${exam.title} malgré une indisponibilité déclarée.`,
          entityType: "Assignment",
          entityId: assignment.id,
          resolutionUrl: "/assignments"
        });
      }
    }
  }

  for (const teacher of snapshot.teachers) {
    if (teacher.quotaAnnual == null) continue;
    const count = snapshot.annualAssignmentCounts.get(teacher.id) ?? 0;
    if (count > teacher.quotaAnnual) {
      alerts.push({
        fingerprint: `quota:${teacher.id}`,
        type: "QUOTA_EXCEEDED",
        severity: "WARNING",
        title: "Quota dépassé",
        message: `${teacher.name} totalise ${count} surveillance${count > 1 ? "s" : ""} pour un quota de ${teacher.quotaAnnual}.`,
        entityType: "User",
        entityId: teacher.id,
        resolutionUrl: "/teachers"
      });
    }
  }

  if (snapshot.exams.length === 0) {
    alerts.push({
      fingerprint: "data:no-exams",
      type: "DATA_QUALITY",
      severity: "CRITICAL",
      title: "Campagne sans examen",
      message: "Aucun examen n’est rattaché à cette campagne.",
      entityType: "Campaign",
      entityId: snapshot.campaign.id,
      resolutionUrl: "/exams"
    });
  }

  return alerts;
}

