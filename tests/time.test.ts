import test from "node:test";
import assert from "node:assert/strict";
import { academicYearForDate, dateKey } from "@/lib/format";
import { todayInTimeZone } from "@/lib/time";

test("utilise le jour civil de Paris après minuit local", () => {
  const now = new Date("2026-07-20T22:30:00.000Z");
  assert.equal(dateKey(todayInTimeZone(now)), "2026-07-21");
});

test("gère le changement d’année en heure de Paris", () => {
  const now = new Date("2026-12-31T23:30:00.000Z");
  assert.equal(dateKey(todayInTimeZone(now)), "2027-01-01");
});

test("permet un fuseau explicite pour les contrôles techniques", () => {
  const now = new Date("2026-07-20T22:30:00.000Z");
  assert.equal(dateKey(todayInTimeZone(now, "UTC")), "2026-07-20");
});

test("calcule l’année universitaire à partir de la date civile", () => {
  const now = new Date("2026-08-31T22:30:00.000Z");
  assert.equal(academicYearForDate(todayInTimeZone(now)), "2026-2027");
});
