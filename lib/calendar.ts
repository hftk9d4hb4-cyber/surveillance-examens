import { addHours, format } from "date-fns";
import type { Exam, User } from "@prisma/client";

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatIcsDate(date: Date) {
  return format(date, "yyyyMMdd'T'HHmmss");
}

export function examStartEnd(exam: Pick<Exam, "date" | "halfDay">) {
  const start = new Date(exam.date);
  start.setHours(exam.halfDay === "AM" ? 8 : 13, 30, 0, 0);
  const end = addHours(start, 4);
  return { start, end };
}

export function generateConvocationIcs(exam: Exam, teacher: User) {
  const { start, end } = examStartEnd(exam);
  const uid = `surveillance-${exam.id}-${teacher.id}@faculte.local`;
  const now = formatIcsDate(new Date());
  const description = [
    `Convocation à une surveillance d’examen.`,
    `Examen : ${exam.title}`,
    `Promotion : ${exam.promotion}`,
    exam.notes ? `Notes : ${exam.notes}` : ""
  ].filter(Boolean).join("\\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Faculte//Surveillances examens//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=Europe/Paris:${formatIcsDate(start)}`,
    `DTEND;TZID=Europe/Paris:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(`Surveillance - ${exam.title}`)}`,
    `LOCATION:${escapeIcsText(exam.location)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `ORGANIZER;CN=Scolarité:mailto:${process.env.MAIL_FROM ?? "scolarite@faculte.fr"}`,
    `ATTENDEE;CN=${escapeIcsText(teacher.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${teacher.email}`,
    "END:VEVENT",
    "END:VCALENDAR",
    ""
  ].join("\r\n");
}
