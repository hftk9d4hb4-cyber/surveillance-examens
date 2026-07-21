import test from "node:test";
import assert from "node:assert/strict";
import { hasProtectedScheduleChange } from "@/lib/exam-import-policy";

const existing = {
  title: "ECOS chirurgie",
  date: new Date("2026-10-15T00:00:00.000Z"),
  halfDay: "AM" as const,
  startTime: "08:00",
  endTime: "12:00",
  location: "Faculté"
};

test("autorise une mise à jour sans changement de planification", () => {
  assert.equal(hasProtectedScheduleChange(existing, { ...existing }), false);
});

test("détecte un changement de date, horaire ou lieu", () => {
  assert.equal(hasProtectedScheduleChange(existing, { ...existing, date: new Date("2026-10-16T00:00:00.000Z") }), true);
  assert.equal(hasProtectedScheduleChange(existing, { ...existing, startTime: "09:00" }), true);
  assert.equal(hasProtectedScheduleChange(existing, { ...existing, location: "Pasteur" }), true);
});
