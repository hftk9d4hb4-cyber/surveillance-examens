import assert from "node:assert/strict";
import test from "node:test";
import { buildAnnualStatistics } from "../lib/annual-statistics";

test("annual statistics summarize coverage, weighted loads, and services", () => {
  const result = buildAnnualStatistics([
    { id: "e1", requiredSupervisors: 2, assignments: [
      { userId: "a", scoreDetails: { assignmentWeight: 1.5 } },
      { userId: "b", scoreDetails: null }
    ] },
    { id: "e2", requiredSupervisors: 1, assignments: [
      { userId: "a", scoreDetails: { assignmentWeight: 2 } },
      { userId: "outside-list", scoreDetails: null }
    ] }
  ], [
    { id: "a", name: "Alice", department: "Chirurgie", quotaAnnual: 4 },
    { id: "b", name: "Bob", department: null, quotaAnnual: null },
    { id: "c", name: "Chloé", department: "Chirurgie", quotaAnnual: 2 }
  ]);

  assert.equal(result.examCount, 2);
  assert.equal(result.requiredPosts, 3);
  assert.equal(result.assignedPosts, 3);
  assert.equal(result.totalAssignments, 4);
  assert.equal(result.coveragePercent, 100);
  assert.equal(result.teacherRows.find((teacher) => teacher.id === "a")?.workloadPoints, 3.5);
  assert.equal(result.teacherRows.find((teacher) => teacher.id === "b")?.workloadPoints, 1);
  assert.equal(result.departments.find((row) => row.department === "Chirurgie")?.teacherCount, 2);
  assert.equal(result.departments.find((row) => row.department === "Service non renseigné")?.assignmentCount, 1);
});

test("annual statistics handle a year without exams", () => {
  const result = buildAnnualStatistics([], [{ id: "a", name: "Alice", department: "Médecine", quotaAnnual: 3 }]);
  assert.equal(result.coveragePercent, null);
  assert.equal(result.missingPosts, 0);
  assert.equal(result.teacherRows[0].assignmentCount, 0);
});
