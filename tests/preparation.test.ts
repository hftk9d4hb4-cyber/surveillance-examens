import assert from "node:assert/strict";
import test from "node:test";
import { buildPreparationReport, type PreparationInput } from "../lib/preparation-core";
const date = new Date("2040-11-10T00:00:00Z");
function input(): PreparationInput {
  return { teachers: [{ id: "t" }], exams: [{ id: "e", title: "Examen", date, halfDay: "AM", requiredSupervisors: 1, assignments: [{ id: "a", userId: "t", user: { name: "Test", role: "TEACHER", isActive: true, mustChangePassword: false, quotaAnnual: 1 }, convocation: null, acknowledgement: null }] }], availabilities: [{ userId: "t", date, halfDay: "AM", status: "AVAILABLE" }], absences: [], otherAssignments: [], annualCounts: new Map([["t", 1]]), maxAssignmentsPerDay: 1 };
}
test("coverage is evaluated per exam; overstaffing cannot hide vacancies", () => {
  const i = input(); i.exams.push({ ...i.exams[0], id: "empty", assignments: [] });
  i.exams[0].assignments.push({ ...i.exams[0].assignments[0], id: "b", userId: "other" });
  assert.equal(buildPreparationReport(i).missingPosts, 1);
  assert.equal(buildPreparationReport(i).ready, false);
});
test("cross-campaign conflicts and daily limit are blocked without exposing external details", () => {
  const i = input(); i.otherAssignments.push({ id: "external", userId: "t", examId: "outside", date, halfDay: "AM" });
  assert.ok(buildPreparationReport(i).blockers.some(x => x.code === "CONFLICT"));
  i.otherAssignments[0].halfDay = "PM";
  assert.ok(buildPreparationReport(i).blockers.some(x => x.code === "DAY_LIMIT"));
  i.maxAssignmentsPerDay = 2;
  assert.equal(buildPreparationReport(i).ready, true);
});
test("absence, unavailable and ineligible accounts block publication", () => {
  const i = input(); i.absences.push({ userId: "t", startDate: date, endDate: date });
  assert.ok(buildPreparationReport(i).blockers.some(x => x.code === "UNAVAILABLE"));
  i.absences = []; i.availabilities[0].status = "UNAVAILABLE";
  assert.equal(buildPreparationReport(i).ready, false);
  i.availabilities[0].status = "AVAILABLE"; i.exams[0].assignments[0].user.isActive = false;
  const report = buildPreparationReport(i);
  assert.equal(report.missingPosts, 1);
  assert.ok(report.blockers.some(x => x.code === "INACTIVE"));
});
test("missing answers and exceeded quotas remain warnings; acknowledgements only count sent mail", () => {
  const i = input(); i.availabilities = []; i.annualCounts.set("t", 2);
  let report = buildPreparationReport(i);
  assert.equal(report.ready, true); assert.equal(report.warnings.length, 2);
  assert.equal(report.pendingConvocations, 1); assert.equal(report.pendingAcknowledgements, 0); assert.equal(report.missingAvailability, 1);
  i.exams[0].assignments[0].convocation = { status: "ERROR" };
  assert.equal(buildPreparationReport(i).failedConvocations, 1);
  i.exams[0].assignments[0].convocation = { status: "SENT" };
  report = buildPreparationReport(i); assert.equal(report.pendingConvocations, 0); assert.equal(report.pendingAcknowledgements, 1);
  i.exams[0].assignments[0].acknowledgement = { acknowledgedAt: date };
  assert.equal(buildPreparationReport(i).pendingAcknowledgements, 0);
});
test("empty scope blocks and unrelated availability cannot count as complete", () => {
  const i = input(); i.availabilities[0].halfDay = "PM";
  assert.equal(buildPreparationReport(i).missingAvailability, 1);
  i.exams = []; assert.equal(buildPreparationReport(i).ready, false);
});
