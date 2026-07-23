import { dateKey, formatDate, formatDateTime, halfDayLabel } from "@/lib/format";

type ExportAssignment = {
  id: string;
  source: string;
  locked: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    department: string | null;
  };
  convocation: {
    status: string;
    sentAt: Date | null;
  } | null;
  acknowledgement: {
    acknowledgedAt: Date;
  } | null;
};

type ExportExam = {
  id: string;
  title: string;
  date: Date;
  halfDay: string;
  startTime: string;
  endTime: string;
  promotion: string;
  location: string;
  requiredSupervisors: number;
  status: string;
  assignments: ExportAssignment[];
};

type ExportTeacher = {
  id: string;
  name: string;
  email: string;
  department: string | null;
  quotaAnnual: number | null;
};

type ExportAlert = {
  severity: string;
  type: string;
  title: string;
  message: string;
  createdAt: Date;
  resolvedAt: Date | null;
};

type ExportChange = {
  type: string;
  status: string;
  reason: string;
  affectedUserIds: unknown;
  notificationErrors: number;
  requestedBy: { name: string } | null;
  exam: { title: string; date: Date };
  createdAt: Date;
  appliedAt: Date | null;
};

export type CampaignOperationalExportInput = {
  generatedAt: Date;
  campaign: {
    name: string;
    academicYear: string;
    promotion: string;
    status: string;
    startDate: Date;
    endDate: Date;
    manager: { name: string } | null;
  };
  kpis: {
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
  exams: ExportExam[];
  teachers: ExportTeacher[];
  respondingTeacherIds: Set<string>;
  annualAssignmentCounts: Map<string, number>;
  alerts: ExportAlert[];
  changes: ExportChange[];
};

const campaignStatusLabels: Record<string, string> = {
  PREPARATION: "Préparation",
  COLLECTING: "Collecte",
  ASSIGNING: "Affectation",
  PUBLISHED: "Publiée",
  CLOSED: "Clôturée"
};

const examStatusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publié",
  CANCELLED: "Annulé"
};

const convocationStatusLabels: Record<string, string> = {
  PENDING: "À envoyer",
  SENT: "Envoyée",
  ERROR: "Erreur"
};

const severityLabels: Record<string, string> = {
  INFO: "Information",
  WARNING: "Avertissement",
  CRITICAL: "Critique"
};

const changeTypeLabels: Record<string, string> = {
  EXAM_CANCELLED: "Annulation de l’examen",
  SCHEDULE_OR_LOCATION: "Horaire ou lieu",
  TEACHER_REPLACED: "Remplacement d’un surveillant",
  TEACHER_ADDED: "Ajout d’un surveillant",
  TEACHER_REMOVED: "Retrait d’un surveillant",
  LATE_UNAVAILABILITY: "Indisponibilité tardive",
  CORRECTION: "Correction"
};

function percentage(value: number) {
  return `${value} %`;
}

function affectedCount(value: unknown) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string").length : 0;
}

export function campaignExportFileName(name: string, generatedAt: Date) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "campagne";
  return `pilotage-${slug}-${dateKey(generatedAt)}.xlsx`;
}

export function buildCampaignOperationalRows(input: CampaignOperationalExportInput) {
  const activeAlerts = input.alerts.filter((alert) => !alert.resolvedAt);
  const criticalAlerts = activeAlerts.filter((alert) => alert.severity === "CRITICAL");
  const acknowledgedAssignments = input.exams.reduce(
    (total, exam) => total + exam.assignments.filter((assignment) => assignment.acknowledgement).length,
    0
  );

  const summary = [
    { indicator: "Campagne", value: input.campaign.name },
    { indicator: "Année universitaire", value: input.campaign.academicYear },
    { indicator: "Promotion", value: input.campaign.promotion },
    { indicator: "Période", value: `${formatDate(input.campaign.startDate)} au ${formatDate(input.campaign.endDate)}` },
    { indicator: "Statut", value: campaignStatusLabels[input.campaign.status] ?? input.campaign.status },
    { indicator: "Gestionnaire", value: input.campaign.manager?.name ?? "Non attribuée" },
    { indicator: "Export généré le", value: formatDateTime(input.generatedAt) },
    { indicator: "Progression globale", value: percentage(input.kpis.progressPercent) },
    { indicator: "Examens", value: input.kpis.exams },
    { indicator: "Postes nécessaires", value: input.kpis.requiredPosts },
    { indicator: "Postes affectés", value: input.kpis.assignedPosts },
    { indicator: "Couverture", value: percentage(input.kpis.coveragePercent) },
    { indicator: "Enseignants ayant répondu", value: `${input.kpis.respondingTeachers}/${input.kpis.totalTeachers}` },
    { indicator: "Disponibilités renseignées", value: percentage(input.kpis.availabilityPercent) },
    { indicator: "Réponses manquantes", value: input.kpis.missingAvailability },
    { indicator: "Convocations envoyées", value: input.kpis.sentConvocations },
    { indicator: "Taux de convocation", value: percentage(input.kpis.convocationPercent) },
    { indicator: "Prises de connaissance", value: `${acknowledgedAssignments}/${input.kpis.sentConvocations}` },
    { indicator: "Alertes actives", value: activeAlerts.length },
    { indicator: "Alertes critiques actives", value: criticalAlerts.length },
    { indicator: "Modifications post-convocation", value: input.changes.length }
  ];

  const planning = input.exams.map((exam) => {
    const missing = Math.max(0, exam.requiredSupervisors - exam.assignments.length);
    const sent = exam.assignments.filter((assignment) => assignment.convocation?.status === "SENT").length;
    const errors = exam.assignments.filter((assignment) => assignment.convocation?.status === "ERROR").length;
    const acknowledged = exam.assignments.filter((assignment) => assignment.acknowledgement).length;
    return {
      date: formatDate(exam.date),
      halfDay: halfDayLabel(exam.halfDay),
      time: `${exam.startTime}-${exam.endTime}`,
      exam: exam.title,
      promotion: exam.promotion,
      location: exam.location,
      status: examStatusLabels[exam.status] ?? exam.status,
      required: exam.requiredSupervisors,
      assigned: exam.assignments.length,
      missing,
      coverage: exam.requiredSupervisors === 0
        ? "—"
        : percentage(Math.min(100, Math.round((exam.assignments.length / exam.requiredSupervisors) * 100))),
      teachers: exam.assignments.map((assignment) => assignment.user.name).join(", "),
      sent,
      errors,
      acknowledged
    };
  });

  const assignments = input.exams.flatMap((exam) => exam.assignments.map((assignment) => ({
    date: formatDate(exam.date),
    halfDay: halfDayLabel(exam.halfDay),
    time: `${exam.startTime}-${exam.endTime}`,
    exam: exam.title,
    promotion: exam.promotion,
    location: exam.location,
    teacher: assignment.user.name,
    email: assignment.user.email,
    department: assignment.user.department ?? "",
    source: assignment.source === "AUTO" ? "Automatique" : "Manuelle",
    locked: assignment.locked ? "Oui" : "Non",
    convocation: assignment.convocation
      ? convocationStatusLabels[assignment.convocation.status] ?? assignment.convocation.status
      : "À envoyer",
    sentAt: formatDateTime(assignment.convocation?.sentAt),
    acknowledgement: assignment.acknowledgement ? "Confirmée" : "En attente",
    acknowledgedAt: formatDateTime(assignment.acknowledgement?.acknowledgedAt)
  })));

  const campaignAssignmentCounts = new Map<string, number>();
  const sentCounts = new Map<string, number>();
  const acknowledgedCounts = new Map<string, number>();
  for (const exam of input.exams) {
    for (const assignment of exam.assignments) {
      campaignAssignmentCounts.set(assignment.user.id, (campaignAssignmentCounts.get(assignment.user.id) ?? 0) + 1);
      if (assignment.convocation?.status === "SENT") {
        sentCounts.set(assignment.user.id, (sentCounts.get(assignment.user.id) ?? 0) + 1);
      }
      if (assignment.acknowledgement) {
        acknowledgedCounts.set(assignment.user.id, (acknowledgedCounts.get(assignment.user.id) ?? 0) + 1);
      }
    }
  }

  const loads = input.teachers.map((teacher) => {
    const annualAssignments = input.annualAssignmentCounts.get(teacher.id) ?? 0;
    return {
      teacher: teacher.name,
      email: teacher.email,
      department: teacher.department ?? "",
      availability: input.respondingTeacherIds.has(teacher.id) ? "Réponse reçue" : "Sans réponse",
      campaignAssignments: campaignAssignmentCounts.get(teacher.id) ?? 0,
      annualAssignments,
      quota: teacher.quotaAnnual ?? "",
      remaining: teacher.quotaAnnual == null ? "" : teacher.quotaAnnual - annualAssignments,
      sent: sentCounts.get(teacher.id) ?? 0,
      acknowledged: acknowledgedCounts.get(teacher.id) ?? 0
    };
  });

  const alerts = input.alerts.map((alert) => ({
    severity: severityLabels[alert.severity] ?? alert.severity,
    status: alert.resolvedAt ? "Résolue" : "Active",
    type: alert.type,
    title: alert.title,
    message: alert.message,
    detectedAt: formatDateTime(alert.createdAt),
    resolvedAt: formatDateTime(alert.resolvedAt)
  }));

  const changes = input.changes.map((change) => ({
    requestedAt: formatDateTime(change.createdAt),
    examDate: formatDate(change.exam.date),
    exam: change.exam.title,
    type: changeTypeLabels[change.type] ?? change.type,
    status: change.status,
    reason: change.reason,
    affectedTeachers: affectedCount(change.affectedUserIds),
    notificationErrors: change.notificationErrors,
    requester: change.requestedBy?.name ?? "Système",
    appliedAt: formatDateTime(change.appliedAt)
  }));

  return { summary, planning, assignments, loads, alerts, changes };
}
