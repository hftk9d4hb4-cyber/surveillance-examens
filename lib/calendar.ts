import type { Exam, User } from "@prisma/client";

export function examStartEnd(exam: Exam) {
  const start = new Date(exam.date);
  start.setHours(exam.halfDay === "AM" ? 8 : 13, 30, 0, 0);
  const end = new Date(start);
  end.setHours(exam.halfDay === "AM" ? 12 : 17, 30, 0, 0);
  return { start, end };
}

const formatIcsDate = (date: Date) =>
  date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

export function generateConvocationIcs(exam: Exam, teacher: User) {
  const { start, end } = examStartEnd(exam);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Faculte Nice//Surveillance Examens//FR",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${exam.id}-${teacher.id}@examsantenice.fr`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:Surveillance d'examen - ${exam.title}`,
    `LOCATION:${exam.location}`,
    `DESCRIPTION:Promotion ${exam.promotion}`,
    `ATTENDEE;CN=${teacher.name}:MAILTO:${teacher.email}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}
