import test from "node:test";
import assert from "node:assert/strict";
import { isChronologicalTimeRange, isValidAcademicYear, parseIsoDate, timeToMinutes } from "@/lib/validation";

test("valide uniquement les dates civiles ISO", () => {
  assert.equal(parseIsoDate("2026-02-28")?.toISOString().slice(0, 10), "2026-02-28");
  assert.equal(parseIsoDate("2026-02-29"), null);
  assert.equal(parseIsoDate("28/02/2026"), null);
});

test("valide une année universitaire consécutive", () => {
  assert.equal(isValidAcademicYear("2026-2027"), true);
  assert.equal(isValidAcademicYear("2026-2028"), false);
});

test("valide les plages horaires chronologiques", () => {
  assert.equal(timeToMinutes("08:30"), 510);
  assert.equal(isChronologicalTimeRange("08:30", "12:00"), true);
  assert.equal(isChronologicalTimeRange("12:00", "08:30"), false);
  assert.equal(isChronologicalTimeRange("24:00", "25:00"), false);
});
