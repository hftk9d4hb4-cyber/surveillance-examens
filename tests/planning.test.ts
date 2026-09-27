import assert from "node:assert/strict";
import { test } from "node:test";
import { planningMonth, coverageSummary } from "../lib/planning";

test("month boundaries handle December, leap years and invalid input", () => {
  const today = new Date("2026-09-13T00:00:00Z");
  assert.equal(planningMonth("2026-12", today).next, "2027-01");
  assert.equal(planningMonth("2026-01", today).previous, "2025-12");
  assert.equal(planningMonth("2024-02", today).days, 29);
  assert.equal(planningMonth("2026-02", today).days, 28);
  assert.equal(planningMonth("2026-09", today).offset, 1);
  for (const input of ["2026-13", "bad", ["2026-01"], undefined]) {
    assert.equal(planningMonth(input, today).key, "2026-09");
  }
});
test("surplus on one exam never hides missing staff on another", () => {
  const result = coverageSummary([
    { requiredSupervisors: 2, _count: { assignments: 5 } },
    { requiredSupervisors: 3, _count: { assignments: 1 } }
  ]);
  assert.deepEqual(result, { required: 5, missing: 2, coverage: 60, incomplete: 1 });
  assert.equal(coverageSummary([]).coverage, null);
});
