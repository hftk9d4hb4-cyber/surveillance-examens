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

function escapeParameter(value: string) {
  return value.replace(/([\\",;:])/g, "\\$1").replace(/\r?\n/g, " ");
}

function icsUtc(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function calendarSequence(updatedAt: Date) {
  const seconds = Math.floor(updatedAt.getTime() / 1000);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
}

function foldIcsLine(line: string) {
  const chunks: string[] = [];
  let remaining = line;
  while (Buffer.byteLength(remaining, "utf8") > 73) {
    let cut = Math.min(73, remaining.length);
    while (cut > 1 && Buffer.byteLength(remaining.slice(0, cut), "utf8") > 73) cut -= 1;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut);
  }
  chunks.push(remaining);
  return chunks.join("\r\n ");
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
    `UID:${exam.id}-${teacher.id}@surveillance-examens`,
    `DTSTAMP:${icsUtc(new Date())}`,
    `DTSTART:${icsUtc(start)}`,
    `DTEND:${icsUtc(end)}`,
    `SUMMARY:${escapeIcs(`Surveillance — ${exam.title}`)}`,
    `LOCATION:${escapeIcs(exam.location)}`,
    `DESCRIPTION:${escapeIcs(`Promotion ${exam.promotion}${exam.notes ? `\n${exam.notes}` : ""}`)}`,
    `ATTENDEE;CN="${escapeParameter(teacher.name)}";ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${teacher.email}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    `SEQUENCE:${calendarSequence(exam.updatedAt)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    ""
  ].map(foldIcsLine).join("\r\n");
}
