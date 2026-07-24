export const CAMPAIGN_REMINDER_AUDIT_ACTION = "CAMPAIGN_REMINDER_SENT";

export type ActivationStatus = "NOT_INVITED" | "INVITED" | "ACTIVATED" | "INACTIVE";
export type AvailabilityProgress = "NONE" | "PARTIAL" | "COMPLETE";
export type ReminderOverallStatus = "INACTIVE" | "TO_ACTIVATE" | "NO_RESPONSE" | "INCOMPLETE" | "COMPLETE";

export type ReminderTeacherInput = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  passwordHash: string | null;
  mustChangePassword: boolean;
  activationSentAt: Date | null;
  lastLoginAt: Date | null;
};

export type CampaignSlot = {
  date: Date;
  halfDay: string;
};

export type TeacherAvailabilityInput = {
  userId: string;
  date: Date;
  halfDay: string;
};

export type ReminderAuditInput = {
  entityId: string | null;
  createdAt: Date;
  details: unknown;
};

export type ReminderTeacherRow = {
  id: string;
  name: string;
  email: string;
  activationStatus: ActivationStatus;
  availabilityProgress: AvailabilityProgress;
  answeredSlots: number;
  expectedSlots: number;
  lastLoginAt: Date | null;
  lastReminderAt: Date | null;
  reminderCount: number;
  overallStatus: ReminderOverallStatus;
  requiredAction: string;
};

export type ReminderFilters = {
  search?: string;
  activation?: ActivationStatus | "";
  availability?: AvailabilityProgress | "";
  status?: ReminderOverallStatus | "";
  includeComplete?: boolean;
};

function slotKey(date: Date, halfDay: string) {
  return `${date.toISOString().slice(0, 10)}:${halfDay}`;
}

function activationStatus(teacher: ReminderTeacherInput): ActivationStatus {
  if (!teacher.isActive) return "INACTIVE";
  if (teacher.passwordHash && !teacher.mustChangePassword) return "ACTIVATED";
  if (teacher.activationSentAt) return "INVITED";
  return "NOT_INVITED";
}

function availabilityProgress(answeredSlots: number, expectedSlots: number): AvailabilityProgress {
  if (answeredSlots === 0 || expectedSlots === 0) return "NONE";
  return answeredSlots >= expectedSlots ? "COMPLETE" : "PARTIAL";
}

function reminderBelongsToCampaign(details: unknown, campaignId: string) {
  return Boolean(
    details &&
    typeof details === "object" &&
    !Array.isArray(details) &&
    "campaignId" in details &&
    (details as { campaignId?: unknown }).campaignId === campaignId
  );
}

function overallStatus(activation: ActivationStatus, availability: AvailabilityProgress): ReminderOverallStatus {
  if (activation === "INACTIVE") return "INACTIVE";
  if (activation !== "ACTIVATED") return "TO_ACTIVATE";
  if (availability === "NONE") return "NO_RESPONSE";
  if (availability === "PARTIAL") return "INCOMPLETE";
  return "COMPLETE";
}

const REQUIRED_ACTION: Record<ReminderOverallStatus, string> = {
  INACTIVE: "Vérifier si le compte doit être réactivé",
  TO_ACTIVATE: "Finaliser l’activation du compte",
  NO_RESPONSE: "Relancer pour obtenir les disponibilités",
  INCOMPLETE: "Demander de compléter les disponibilités",
  COMPLETE: "Aucune action requise"
};

export function buildReminderRows(input: {
  campaignId: string;
  teachers: ReminderTeacherInput[];
  slots: CampaignSlot[];
  availabilities: TeacherAvailabilityInput[];
  reminderAudits: ReminderAuditInput[];
}): ReminderTeacherRow[] {
  const expectedSlots = new Set(input.slots.map((slot) => slotKey(slot.date, slot.halfDay)));
  const availabilityByTeacher = new Map<string, Set<string>>();

  for (const availability of input.availabilities) {
    const key = slotKey(availability.date, availability.halfDay);
    if (!expectedSlots.has(key)) continue;
    const answers = availabilityByTeacher.get(availability.userId) ?? new Set<string>();
    answers.add(key);
    availabilityByTeacher.set(availability.userId, answers);
  }

  return input.teachers.map((teacher) => {
    const answers = availabilityByTeacher.get(teacher.id) ?? new Set<string>();
    const audits = input.reminderAudits
      .filter((audit) => audit.entityId === teacher.id && reminderBelongsToCampaign(audit.details, input.campaignId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const activation = activationStatus(teacher);
    const availability = availabilityProgress(answers.size, expectedSlots.size);
    const status = overallStatus(activation, availability);

    return {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      activationStatus: activation,
      availabilityProgress: availability,
      answeredSlots: answers.size,
      expectedSlots: expectedSlots.size,
      lastLoginAt: teacher.lastLoginAt,
      lastReminderAt: audits[0]?.createdAt ?? null,
      reminderCount: audits.length,
      overallStatus: status,
      requiredAction: REQUIRED_ACTION[status]
    };
  });
}

export function filterReminderRows(rows: ReminderTeacherRow[], filters: ReminderFilters) {
  const search = filters.search?.trim().toLocaleLowerCase("fr") ?? "";

  return rows.filter((row) => {
    if (!filters.includeComplete && row.overallStatus === "COMPLETE") return false;
    if (search && !`${row.name} ${row.email}`.toLocaleLowerCase("fr").includes(search)) return false;
    if (filters.activation && row.activationStatus !== filters.activation) return false;
    if (filters.availability && row.availabilityProgress !== filters.availability) return false;
    if (filters.status && row.overallStatus !== filters.status) return false;
    return true;
  });
}
