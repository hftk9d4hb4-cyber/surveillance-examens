import test from "node:test";
import assert from "node:assert/strict";
import { calculateCampaignKpis, detectCampaignAlerts } from "../lib/campaign-dashboard-core";

const date = new Date("2027-01-10T00:00:00.000Z");
const base = {
  campaign: { id: "c1", name: "Janvier", academicYear: "2026-2027", promotion: "DFASM1", status: "ASSIGNING" as const, startDate: date, endDate: date, responseDeadline: null },
  teachers: [
    { id: "u1", name: "Alice", quotaAnnual: 1 },
    { id: "u2", name: "Bob", quotaAnnual: 4 }
  ],
  availabilities: [{ userId: "u1", date, halfDay: "AM" as const, status: "AVAILABLE" as const }],
  absences: [],
  annualAssignmentCounts: new Map([["u1", 2]]),
  exams: [{
    id: "e1", title: "Anatomie", date, halfDay: "AM" as const, requiredSupervisors: 2, notes: null,
    assignments: [{ id: "a1", userId: "u1", user: { id: "u1", name: "Alice", quotaAnnual: 1 }, convocation: { status: "SENT" } }]
  }]
};

test("calcule les KPI de couverture, réponse et convocation", () => {
  const kpis = calculateCampaignKpis(base);
  assert.equal(kpis.requiredPosts, 2);
  assert.equal(kpis.assignedPosts, 1);
  assert.equal(kpis.coveragePercent, 50);
  assert.equal(kpis.availabilityPercent, 50);
  assert.equal(kpis.convocationPercent, 100);
});

test("détecte les disponibilités manquantes, sous-effectifs et quotas dépassés", () => {
  const alerts = detectCampaignAlerts(base);
  assert.ok(alerts.some((alert) => alert.type === "MISSING_AVAILABILITY" && alert.entityId === "u2"));
  assert.ok(alerts.some((alert) => alert.type === "UNDERSTAFFED_EXAM" && alert.entityId === "e1"));
  assert.ok(alerts.some((alert) => alert.type === "QUOTA_EXCEEDED" && alert.entityId === "u1"));
});

test("détecte une affectation malgré indisponibilité", () => {
  const snapshot = { ...base, availabilities: [{ userId: "u1", date, halfDay: "AM" as const, status: "UNAVAILABLE" as const }] };
  const alerts = detectCampaignAlerts(snapshot);
  assert.ok(alerts.some((alert) => alert.type === "UNAVAILABLE_TEACHER"));
});
