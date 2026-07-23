import test from "node:test";
import assert from "node:assert/strict";
import { acknowledgementDecision } from "../lib/acknowledgement-policy";

const today = new Date("2026-09-01T00:00:00.000Z");
const base = {
  actorId: "teacher-1",
  actorRole: "TEACHER",
  assignmentUserId: "teacher-1",
  convocationStatus: "SENT",
  examStatus: "PUBLISHED",
  examDate: new Date("2026-09-10T00:00:00.000Z"),
  alreadyAcknowledged: false
};

test("a teacher can acknowledge their sent future convocation", () => {
  assert.equal(acknowledgementDecision(base, today), "ALLOWED");
});

test("a teacher cannot acknowledge another teacher's assignment", () => {
  assert.equal(acknowledgementDecision({ ...base, actorId: "teacher-2" }, today), "NOT_OWNER");
});

test("staff cannot acknowledge on behalf of a teacher", () => {
  assert.equal(acknowledgementDecision({ ...base, actorId: "manager-1", actorRole: "MANAGER" }, today), "NOT_OWNER");
});

test("an unsent convocation cannot be acknowledged", () => {
  assert.equal(acknowledgementDecision({ ...base, convocationStatus: "PENDING" }, today), "NOT_SENT");
});

test("a past or cancelled exam cannot be acknowledged", () => {
  assert.equal(acknowledgementDecision({ ...base, examDate: new Date("2026-08-31T00:00:00.000Z") }, today), "EXAM_UNAVAILABLE");
  assert.equal(acknowledgementDecision({ ...base, examStatus: "CANCELLED" }, today), "EXAM_UNAVAILABLE");
});

test("acknowledgement is idempotent", () => {
  assert.equal(acknowledgementDecision({ ...base, alreadyAcknowledged: true }, today), "ALREADY_ACKNOWLEDGED");
});
