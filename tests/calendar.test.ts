import test from "node:test";
import assert from "node:assert/strict";
import { calendarSequence, examStartEnd, generateConvocationCancellationIcs, generateConvocationIcs } from "@/lib/calendar";

const exam = {
  id: "exam-1",
  externalId: null,
  title: "ECOS, chirurgie; digestive",
  date: new Date("2026-10-15T00:00:00.000Z"),
  halfDay: "AM",
  startTime: "08:30",
  endTime: "12:30",
  timezone: "Europe/Paris",
  academicYear: "2026-2027",
  promotion: "DFASM2",
  location: "Faculté, salle A",
  requiredSupervisors: 2,
  status: "PUBLISHED",
  notes: "Présence 15 min avant\nAccueil",
  createdAt: new Date(),
  updatedAt: new Date("2026-07-20T20:00:00.000Z")
} as const;

const teacher = {
  id: "teacher-1",
  firstName: "Anne",
  lastName: "Durand",
  name: "Anne Durand",
  email: "anne@example.fr",
  passwordHash: null,
  role: "TEACHER",
  department: null,
  speciality: null,
  quotaAnnual: 3,
  isActive: true,
  mustChangePassword: false,
  activationSentAt: null,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date("2026-07-20T20:00:00.000Z")
} as const;

test("convertit l’horaire Europe/Paris vers UTC", () => {
  const { start, end } = examStartEnd(exam);
  assert.equal(start.toISOString(), "2026-10-15T06:30:00.000Z");
  assert.equal(end.toISOString(), "2026-10-15T10:30:00.000Z");
});

test("génère une invitation ICS échappée et terminée en CRLF", () => {
  const ics = generateConvocationIcs(exam as never, teacher as never);
  assert.match(ics, /SUMMARY:Surveillance — ECOS\\, chirurgie\\; digestive/);
  assert.match(ics, /LOCATION:Faculté\\, salle A/);
  assert.match(ics, /Présence 15 min avant\\nAccueil/);
  assert.match(ics, /ATTENDEE;CN="Anne Durand"/);
  assert.match(ics, new RegExp(`SEQUENCE:${calendarSequence(exam.updatedAt)}`));
  assert.ok(ics.endsWith("\r\n"));
});

test("augmente la séquence calendrier quand l’examen est mis à jour", () => {
  const before = calendarSequence(new Date("2026-07-20T20:00:00.000Z"));
  const after = calendarSequence(new Date("2026-07-20T20:00:01.000Z"));
  assert.equal(after, before + 1);
});

test("génère une annulation calendrier avec une séquence supérieure", () => {
  const ics = generateConvocationCancellationIcs(exam as never, teacher as never);
  assert.match(ics, /METHOD:CANCEL/);
  assert.match(ics, /STATUS:CANCELLED/);
  assert.match(ics, new RegExp(`SEQUENCE:${calendarSequence(exam.updatedAt) + 1}`));
});
