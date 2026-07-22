import type { HalfDay } from "@prisma/client";

const frDate = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC"
});

export function formatDate(date: Date) {
  return frDate.format(date);
}

export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function halfDayLabel(halfDay: HalfDay | string) {
  return halfDay === "AM" ? "Matin" : "Après-midi";
}

export function academicYearForDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const start = month >= 9 ? year : year - 1;
  return `${start}-${start + 1}`;
}

export function formatDateTime(date?: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris"
  }).format(date);
}
