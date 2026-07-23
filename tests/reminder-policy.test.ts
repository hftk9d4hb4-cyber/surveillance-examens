import test from "node:test";
import assert from "node:assert/strict";
import {
  REMINDER_BATCH_LIMIT,
  REMINDER_COOLDOWN_MS,
  reminderCooldownStart,
  reminderKindFor
} from "../lib/reminder-policy";

test("an unactivated account receives an activation reminder", () => {
  assert.equal(reminderKindFor({
    activationStatus: "INVITED",
    availabilityProgress: "NONE",
    overallStatus: "TO_ACTIVATE"
  }, "COLLECTING"), "ACTIVATION");
});

test("an activated teacher with an incomplete answer receives an availability reminder", () => {
  assert.equal(reminderKindFor({
    activationStatus: "ACTIVATED",
    availabilityProgress: "PARTIAL",
    overallStatus: "INCOMPLETE"
  }, "COLLECTING"), "AVAILABILITY");
});

test("availability reminders are only sent while collecting or assigning", () => {
  const row = {
    activationStatus: "ACTIVATED" as const,
    availabilityProgress: "NONE" as const,
    overallStatus: "NO_RESPONSE" as const
  };
  assert.equal(reminderKindFor(row, "PREPARATION"), null);
  assert.equal(reminderKindFor(row, "PUBLISHED"), null);
  assert.equal(reminderKindFor(row, "COLLECTING"), "AVAILABILITY");
  assert.equal(reminderKindFor(row, "ASSIGNING"), "AVAILABILITY");
});

test("inactive, complete and closed records cannot be reminded", () => {
  assert.equal(reminderKindFor({
    activationStatus: "INACTIVE",
    availabilityProgress: "NONE",
    overallStatus: "INACTIVE"
  }, "COLLECTING"), null);
  assert.equal(reminderKindFor({
    activationStatus: "ACTIVATED",
    availabilityProgress: "COMPLETE",
    overallStatus: "COMPLETE"
  }, "COLLECTING"), null);
  assert.equal(reminderKindFor({
    activationStatus: "INVITED",
    availabilityProgress: "NONE",
    overallStatus: "TO_ACTIVATE"
  }, "CLOSED"), null);
});

test("the resend cooldown and batch limit remain bounded", () => {
  const now = new Date("2026-07-23T12:00:00.000Z");
  assert.equal(reminderCooldownStart(now).toISOString(), new Date(now.getTime() - REMINDER_COOLDOWN_MS).toISOString());
  assert.equal(REMINDER_BATCH_LIMIT, 50);
});
