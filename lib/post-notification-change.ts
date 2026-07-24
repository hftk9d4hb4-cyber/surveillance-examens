import { isChronologicalTimeRange, TIME_PATTERN } from "@/lib/validation";

export const POST_NOTIFICATION_CHANGE_TYPES = [
  "EXAM_CANCELLED",
  "SCHEDULE_OR_LOCATION",
  "TEACHER_REPLACED",
  "TEACHER_ADDED",
  "TEACHER_REMOVED",
  "LATE_UNAVAILABILITY",
  "CORRECTION"
] as const;

export type PostNotificationChangeType = typeof POST_NOTIFICATION_CHANGE_TYPES[number];

export const postNotificationChangeLabels: Record<PostNotificationChangeType, string> = {
  EXAM_CANCELLED: "Annulation de l’examen",
  SCHEDULE_OR_LOCATION: "Modification d’horaire ou de lieu",
  TEACHER_REPLACED: "Remplacement d’un enseignant",
  TEACHER_ADDED: "Ajout d’un enseignant",
  TEACHER_REMOVED: "Retrait d’un enseignant",
  LATE_UNAVAILABILITY: "Indisponibilité tardive et remplacement",
  CORRECTION: "Correction des informations de convocation"
};

type PreviewAssignment = {
  id: string;
  userId: string;
  userName: string;
  convocationStatus: string | null;
};

export type ChangePreviewInput = {
  type: string;
  reason: string;
  assignmentId?: string;
  replacementUserId?: string;
  replacementUserName?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  exam: {
    id: string;
    title: string;
    updatedAt: Date;
    startTime: string;
    endTime: string;
    location: string;
    assignments: PreviewAssignment[];
  };
};

export type ChangePreview = {
  type: PostNotificationChangeType;
  reason: string;
  payload: Record<string, string | null>;
  snapshot: Record<string, string>;
  affectedUserIds: string[];
  consequences: string[];
};

export function buildPostNotificationChangePreview(input: ChangePreviewInput): ChangePreview | null {
  if (!POST_NOTIFICATION_CHANGE_TYPES.includes(input.type as PostNotificationChangeType)) return null;
  const type = input.type as PostNotificationChangeType;
  const reason = input.reason.trim();
  if (reason.length < 5 || reason.length > 500) return null;

  const notified = input.exam.assignments.filter((assignment) => assignment.convocationStatus === "SENT");
  if (notified.length === 0) return null;
  const selected = input.assignmentId
    ? input.exam.assignments.find((assignment) => assignment.id === input.assignmentId)
    : undefined;
  const startTime = input.startTime?.trim() || input.exam.startTime;
  const endTime = input.endTime?.trim() || input.exam.endTime;
  const location = input.location?.trim() || input.exam.location;
  const scheduleType = type === "SCHEDULE_OR_LOCATION" || type === "CORRECTION";

  if (scheduleType) {
    if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime) || !isChronologicalTimeRange(startTime, endTime)) return null;
    if (location.length < 2 || location.length > 180) return null;
    if (startTime === input.exam.startTime && endTime === input.exam.endTime && location === input.exam.location) return null;
  }

  if (["TEACHER_REMOVED", "TEACHER_REPLACED", "LATE_UNAVAILABILITY"].includes(type)) {
    if (!selected || selected.convocationStatus !== "SENT") return null;
  }
  if (["TEACHER_ADDED", "TEACHER_REPLACED", "LATE_UNAVAILABILITY"].includes(type)) {
    if (!input.replacementUserId || !input.replacementUserName) return null;
    if (selected?.userId === input.replacementUserId) return null;
  }

  const affectedUserIds =
    type === "EXAM_CANCELLED" || scheduleType
      ? notified.map((assignment) => assignment.userId)
      : (type === "TEACHER_REPLACED" || type === "LATE_UNAVAILABILITY") && selected && input.replacementUserId
        ? [selected.userId, input.replacementUserId]
        : selected
          ? [selected.userId]
          : input.replacementUserId
            ? [input.replacementUserId]
            : [];
  const consequences: string[] = [];

  if (type === "EXAM_CANCELLED") {
    consequences.push(`${notified.length} enseignant(s) déjà convoqué(s) recevront une annulation.`);
    consequences.push("L’examen passera au statut annulé.");
  } else if (scheduleType) {
    consequences.push(`${notified.length} enseignant(s) recevront une convocation mise à jour.`);
    consequences.push("Toutes les prises de connaissance existantes seront réinitialisées.");
  } else if (type === "TEACHER_ADDED") {
    consequences.push(`${input.replacementUserName} sera ajouté(e), convoqué(e) et devra confirmer la prise de connaissance.`);
  } else if (type === "TEACHER_REMOVED") {
    consequences.push(`${selected?.userName} recevra une annulation et sera retiré(e) de l’examen.`);
    consequences.push("Le besoin de surveillance devra être contrôlé après ce retrait.");
  } else {
    consequences.push(`${selected?.userName} recevra une annulation et sera remplacé(e) par ${input.replacementUserName}.`);
    consequences.push("Le nouvel enseignant recevra immédiatement sa convocation.");
  }

  return {
    type,
    reason,
    payload: {
      assignmentId: selected?.id ?? null,
      replacementUserId: input.replacementUserId || null,
      startTime: scheduleType ? startTime : null,
      endTime: scheduleType ? endTime : null,
      location: scheduleType ? location : null
    },
    snapshot: {
      examUpdatedAt: input.exam.updatedAt.toISOString(),
      startTime: input.exam.startTime,
      endTime: input.exam.endTime,
      location: input.exam.location,
      notifiedUserIds: JSON.stringify(notified.map((assignment) => assignment.userId)),
      assignmentId: selected?.id ?? "",
      assignmentUserId: selected?.userId ?? "",
      assignmentUserName: selected?.userName ?? ""
    },
    affectedUserIds,
    consequences
  };
}

export function jsonString(details: unknown, key: string) {
  if (!details || typeof details !== "object" || Array.isArray(details)) return "";
  const value = (details as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}
