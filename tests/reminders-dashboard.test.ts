import test from "node:test";
import assert from "node:assert/strict";
import { buildReminderRows, filterReminderRows } from "../lib/reminders-dashboard-core";

const date1 = new Date("2026-09-01T00:00:00.000Z");
const date2 = new Date("2026-09-02T00:00:00.000Z");
const reminderDate = new Date("2026-08-20T08:00:00.000Z");

const teachers = [
  {
    id: "complete",
    name: "Alice Martin",
    email: "alice@example.fr",
    isActive: true,
    passwordHash: "hash",
    mustChangePassword: false,
    activationSentAt: new Date("2026-07-01T08:00:00.000Z"),
    lastLoginAt: new Date("2026-08-19T08:00:00.000Z")
  },
  {
    id: "partial",
    name: "Benoît Dupont",
    email: "benoit@example.fr",
    isActive: true,
    passwordHash: "hash",
    mustChangePassword: false,
    activationSentAt: new Date("2026-07-01T08:00:00.000Z"),
    lastLoginAt: null
  },
  {
    id: "invited",
    name: "Chloé Bernard",
    email: "chloe@example.fr",
    isActive: true,
    passwordHash: null,
    mustChangePassword: true,
    activationSentAt: new Date("2026-07-01T08:00:00.000Z"),
    lastLoginAt: null
  }
];

function rows() {
  return buildReminderRows({
    campaignId: "campaign-1",
    teachers,
    slots: [{ date: date1, halfDay: "AM" }, { date: date2, halfDay: "PM" }],
    availabilities: [
      { userId: "complete", date: date1, halfDay: "AM" },
      { userId: "complete", date: date2, halfDay: "PM" },
      { userId: "complete", date: new Date("2026-10-01T00:00:00.000Z"), halfDay: "AM" },
      { userId: "partial", date: date1, halfDay: "AM" }
    ],
    reminderAudits: [
      { entityId: "partial", createdAt: reminderDate, details: { campaignId: "campaign-1" } },
      { entityId: "partial", createdAt: new Date("2026-08-18T08:00:00.000Z"), details: { campaignId: "another-campaign" } }
    ]
  });
}

test("the dashboard only counts availability for campaign exam slots", () => {
  const result = rows();
  const complete = result.find((row) => row.id === "complete");
  const partial = result.find((row) => row.id === "partial");

  assert.deepEqual(
    { answered: complete?.answeredSlots, expected: complete?.expectedSlots, status: complete?.overallStatus },
    { answered: 2, expected: 2, status: "COMPLETE" }
  );
  assert.deepEqual(
    { answered: partial?.answeredSlots, expected: partial?.expectedSlots, status: partial?.overallStatus },
    { answered: 1, expected: 2, status: "INCOMPLETE" }
  );
});

test("activation takes precedence over availability in the required action", () => {
  const invited = rows().find((row) => row.id === "invited");
  assert.equal(invited?.activationStatus, "INVITED");
  assert.equal(invited?.overallStatus, "TO_ACTIVATE");
  assert.match(invited?.requiredAction ?? "", /activation/);
});

test("reminders are counted only for the selected campaign", () => {
  const partial = rows().find((row) => row.id === "partial");
  assert.equal(partial?.reminderCount, 1);
  assert.equal(partial?.lastReminderAt?.toISOString(), reminderDate.toISOString());
});

test("complete teachers are excluded by default", () => {
  const result = filterReminderRows(rows(), {});
  assert.deepEqual(result.map((row) => row.id), ["partial", "invited"]);
});

test("search and status filters are cumulative", () => {
  const result = filterReminderRows(rows(), {
    search: "dupont",
    activation: "ACTIVATED",
    availability: "PARTIAL",
    status: "INCOMPLETE",
    includeComplete: true
  });
  assert.deepEqual(result.map((row) => row.id), ["partial"]);
});
