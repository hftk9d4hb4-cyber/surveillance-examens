export type AcknowledgementInput = {
  actorId: string;
  actorRole: string;
  assignmentUserId: string;
  convocationStatus: string | null;
  examStatus: string;
  examDate: Date;
  alreadyAcknowledged: boolean;
};

export type AcknowledgementDecision =
  | "ALLOWED"
  | "ALREADY_ACKNOWLEDGED"
  | "NOT_OWNER"
  | "NOT_SENT"
  | "EXAM_UNAVAILABLE";

export function acknowledgementDecision(
  input: AcknowledgementInput,
  today: Date
): AcknowledgementDecision {
  if (input.actorRole !== "TEACHER" || input.actorId !== input.assignmentUserId) return "NOT_OWNER";
  if (input.alreadyAcknowledged) return "ALREADY_ACKNOWLEDGED";
  if (input.convocationStatus !== "SENT") return "NOT_SENT";
  if (input.examStatus !== "PUBLISHED" || input.examDate < today) return "EXAM_UNAVAILABLE";
  return "ALLOWED";
}
