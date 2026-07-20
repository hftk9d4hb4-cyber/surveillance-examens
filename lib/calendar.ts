import type { Exam, User } from "@prisma/client";
import { fromZonedTime } from "date-fns-tz";
import { dateKey } from "@/lib/format";

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function icsUtc(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function examStartEnd(exam: Pick<Exam, "date" | "startTime" | "endTime" | "timezone">) {
  const day = dateKey(exam.date);
  return {
    start: fromZonedTime(`${day}T${exam.startTime}:00`, exam.timezone),
    end: fromZonedTime(`${day}T${exam.endTime}:00`, exam.timezone)
  };
}

export function generateConvocationIcs(exam: Exam, teacher: User) {
  const { start, end } = examStartEnd(exam);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Faculte de Medecine de Nice//Surveillance Examens//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${exam.id}-${teacher.id}@examsantenice.fr`,
    `DTSTAMP:${icsUtc(new Date())}`,
    `DTSTART:${icsUtc(start)}`,
    `DTEND:${icsUtc(end)}`,
    `SUMMARY:${escapeIcs(`Surveillance — ${exam.title}`)}`,
    `LOCATION:${escapeIcs(exam.location)}`,
    `DESCRIPTION:${escapeIcs(`Promotion ${exam.promotion}${exam.notes ? `\n${exam.notes}` : ""}`)}`,
    `ATTENDEE;CN=${escapeIcs(teacher.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${teacher.email}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
    ""
  ].join("\r\n");
}
