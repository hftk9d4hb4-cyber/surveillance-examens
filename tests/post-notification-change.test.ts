import test from "node:test";
import assert from "node:assert/strict";
import { buildPostNotificationChangePreview } from "../lib/post-notification-change";

const exam = {
  id: "exam-1",
  title: "ECOS",
  updatedAt: new Date("2026-07-23T10:00:00.000Z"),
  startTime: "08:30",
  endTime: "12:30",
  location: "Salle A",
  assignments: [
    { id: "a1", userId: "u1", userName: "Alice", convocationStatus: "SENT" },
    { id: "a2", userId: "u2", userName: "Benoît", convocationStatus: "SENT" }
  ]
};

test("an exam cancellation identifies every notified teacher", () => {
  const preview = buildPostNotificationChangePreview({
    type: "EXAM_CANCELLED",
    reason: "Examen reporté par la faculté",
    exam
  });
  assert.deepEqual(preview?.affectedUserIds, ["u1", "u2"]);
  assert.match(preview?.consequences[0] ?? "", /2 enseignant/);
});

test("a schedule change requires an actual chronological change", () => {
  assert.equal(buildPostNotificationChangePreview({
    type: "SCHEDULE_OR_LOCATION",
    reason: "Modification logistique",
    startTime: "08:30",
    endTime: "12:30",
    location: "Salle A",
    exam
  }), null);
  assert.ok(buildPostNotificationChangePreview({
    type: "SCHEDULE_OR_LOCATION",
    reason: "Modification logistique",
    startTime: "09:00",
    endTime: "12:30",
    location: "Salle A",
    exam
  }));
});

test("replacement requires a notified assignment and a different teacher", () => {
  assert.equal(buildPostNotificationChangePreview({
    type: "TEACHER_REPLACED",
    reason: "Remplacement validé",
    assignmentId: "a1",
    replacementUserId: "u1",
    replacementUserName: "Alice",
    exam
  }), null);
  const preview = buildPostNotificationChangePreview({
    type: "TEACHER_REPLACED",
    reason: "Remplacement validé",
    assignmentId: "a1",
    replacementUserId: "u3",
    replacementUserName: "Chloé",
    exam
  });
  assert.deepEqual(preview?.affectedUserIds, ["u1", "u3"]);
  assert.deepEqual(preview?.payload, {
    assignmentId: "a1",
    replacementUserId: "u3",
    startTime: null,
    endTime: null,
    location: null
  });
});

test("a reason is mandatory and bounded", () => {
  assert.equal(buildPostNotificationChangePreview({
    type: "EXAM_CANCELLED",
    reason: "Non",
    exam
  }), null);
  assert.equal(buildPostNotificationChangePreview({
    type: "EXAM_CANCELLED",
    reason: "x".repeat(501),
    exam
  }), null);
});

test("a workflow cannot start before at least one successful notification", () => {
  assert.equal(buildPostNotificationChangePreview({
    type: "EXAM_CANCELLED",
    reason: "Annulation confirmée",
    exam: { ...exam, assignments: [{ ...exam.assignments[0], convocationStatus: "ERROR" }] }
  }), null);
});
