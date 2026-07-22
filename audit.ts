export type ConfirmationState = "PENDING" | "READ" | "CONFIRMED" | "DECLINED" | "REPLACED";

export function canConfirmConvocation(state: ConfirmationState) {
  return state === "PENDING" || state === "READ";
}

export function canDeclineConvocation(state: ConfirmationState) {
  return state === "PENDING" || state === "READ" || state === "CONFIRMED";
}

export function confirmationLabel(state: ConfirmationState) {
  if (state === "CONFIRMED") return "Confirmée";
  if (state === "DECLINED") return "Refusée";
  if (state === "REPLACED") return "Remplacée";
  if (state === "READ") return "Consultée";
  return "En attente";
}

export function confirmationTone(state: ConfirmationState): "green" | "red" | "amber" | "blue" {
  if (state === "CONFIRMED") return "green";
  if (state === "DECLINED") return "red";
  if (state === "REPLACED") return "blue";
  return "amber";
}

export function examScheduleFingerprint(exam: {
  date: Date | string;
  halfDay: string;
  startTime: string;
  endTime: string;
  location: string;
}) {
  const date = exam.date instanceof Date ? exam.date.toISOString().slice(0, 10) : String(exam.date).slice(0, 10);
  return [date, exam.halfDay, exam.startTime, exam.endTime, exam.location.trim()].join("|");
}
