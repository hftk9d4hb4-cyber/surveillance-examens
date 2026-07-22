import test from "node:test";
import assert from "node:assert/strict";
import { canConfirmConvocation, canDeclineConvocation, confirmationLabel, examScheduleFingerprint } from "@/lib/convocation-confirmation";

test("autorise la confirmation uniquement avant une réponse définitive", () => {
  assert.equal(canConfirmConvocation("PENDING"), true);
  assert.equal(canConfirmConvocation("READ"), true);
  assert.equal(canConfirmConvocation("CONFIRMED"), false);
  assert.equal(canConfirmConvocation("DECLINED"), false);
});

test("autorise un refus motivé après lecture ou confirmation", () => {
  assert.equal(canDeclineConvocation("PENDING"), true);
  assert.equal(canDeclineConvocation("READ"), true);
  assert.equal(canDeclineConvocation("CONFIRMED"), true);
  assert.equal(canDeclineConvocation("REPLACED"), false);
});

test("produit des libellés français stables", () => {
  assert.equal(confirmationLabel("CONFIRMED"), "Confirmée");
  assert.equal(confirmationLabel("DECLINED"), "Refusée");
});

test("détecte les changements de planification par empreinte", () => {
  const base = { date: new Date("2026-10-15T00:00:00.000Z"), halfDay: "AM", startTime: "08:00", endTime: "12:00", location: "Faculté" };
  assert.notEqual(examScheduleFingerprint(base), examScheduleFingerprint({ ...base, location: "Pasteur" }));
});
