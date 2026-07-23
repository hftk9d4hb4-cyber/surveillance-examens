import test from "node:test";
import assert from "node:assert/strict";
import { canAccessCampaign } from "../lib/campaign-access";

test("an administrator can access every campaign", () => {
  assert.equal(canAccessCampaign("another-manager", { id: "admin", role: "ADMIN" }), true);
});

test("a manager can access their campaign and an unassigned campaign", () => {
  assert.equal(canAccessCampaign("manager-1", { id: "manager-1", role: "MANAGER" }), true);
  assert.equal(canAccessCampaign(null, { id: "manager-1", role: "MANAGER" }), true);
});

test("a manager cannot access another manager's campaign", () => {
  assert.equal(canAccessCampaign("manager-2", { id: "manager-1", role: "MANAGER" }), false);
});

test("a teacher cannot access the campaign reminders dashboard", () => {
  assert.equal(canAccessCampaign(null, { id: "teacher-1", role: "TEACHER" }), false);
});
