import assert from "node:assert/strict";
import test from "node:test";
import { accountActivationState } from "../lib/activation-status";
import { explainAssignment } from "../lib/assignment-explanation";
import { buildEquityReport } from "../lib/equity-report";
import { buildAnnualStatistics } from "../lib/annual-statistics";
import { buildAnnualStatisticsWorkbook } from "../lib/annual-statistics-export";

test("activation status separates expired, failed, inactive and completed accounts", () => {
  const u = { isActive: true, mustChangePassword: true, hasPassword: false, activationSentAt: null, latestToken: null };
  assert.equal(accountActivationState(u), "NOT_SENT");
  assert.equal(accountActivationState({ ...u, latestToken: { expiresAt: new Date(0), usedAt: null } }), "EXPIRED");
  assert.equal(accountActivationState({ ...u, lastDelivery: "ACCOUNT_ACTIVATION_FAILED" }), "FAILED");
  assert.equal(accountActivationState({ ...u, isActive: false }), "INACTIVE");
  assert.equal(accountActivationState({ ...u, mustChangePassword: false, hasPassword: true, lastDelivery: "ACCOUNT_ACTIVATION_FAILED" }), "ACTIVATED");
});
test("assignment explanations only use recorded numeric values and identify manual assignments", () => {
  assert.match(explainAssignment("MANUAL", { availabilityPoints: 100 })[0], /manuelle/);
  const lines = explainAssignment("AUTO", { availability: "NO_RESPONSE", quotaPoints: 12.2, fairnessPoints: NaN, assignmentWeight: 1.5 });
  assert.ok(lines.some(x => x.includes("12.2"))); assert.ok(lines.some(x => x.includes("1.5")));
  assert.ok(lines.some(x => x.includes("Aucune réponse"))); assert.ok(lines.every(x => !x.includes("NaN")));
  assert.match(explainAssignment("AUTO", null)[0], /non enregistré/);
});
test("equity uses assignment counts for positive quotas and keeps weighted loads separate", () => {
  const stats = buildAnnualStatistics([{ id: "e", requiredSupervisors: 1, assignments: [{ userId: "a", scoreDetails: { assignmentWeight: 2 } }, { userId: "b", scoreDetails: null }] }], [
    { id: "a", name: "A", department: "X", quotaAnnual: 2 }, { id: "b", name: "B", department: "X", quotaAnnual: 0 }, { id: "c", name: "C", department: "X", quotaAnnual: null }
  ]);
  const row = buildEquityReport(stats)[0];
  assert.equal(row.quotaUsePercent, 50); assert.equal(row.workloadPoints, 3); assert.equal(row.quotaMissing, 1); assert.equal(row.zeroQuota, 1); assert.equal(row.overQuota, 1);
  assert.equal(row.averagePoints, 1); assert.equal(row.minPoints, 0); assert.equal(row.maxPoints, 2);
  const workbook = buildAnnualStatisticsWorkbook(stats, "2040-2041", "X");
  assert.equal(workbook.getWorksheet("Équité")!.rowCount, 2);
  assert.equal(workbook.getWorksheet("Synthèse")!.getCell("B3").value, "Faculté entière");
  assert.deepEqual(buildEquityReport(buildAnnualStatistics([], [])), []);
});
