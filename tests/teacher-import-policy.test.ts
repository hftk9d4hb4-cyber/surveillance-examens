import test from "node:test";
import assert from "node:assert/strict";
import { teacherImportProtectionMessage } from "@/lib/teacher-import-policy";

test("refuse d’écraser un compte gestionnaire par un import enseignant", () => {
  const message = teacherImportProtectionMessage({
    existingRole: "MANAGER",
    existingIsActive: true,
    requestedIsActive: true,
    hasFuturePublishedAssignment: false
  });
  assert.match(message || "", /gestionnaire ou administrateur/);
});

test("refuse de désactiver un enseignant affecté dans le futur", () => {
  const message = teacherImportProtectionMessage({
    existingRole: "TEACHER",
    existingIsActive: true,
    requestedIsActive: false,
    hasFuturePublishedAssignment: true
  });
  assert.match(message || "", /surveillance future/);
});

test("autorise une mise à jour qui préserve la cohérence du planning", () => {
  assert.equal(teacherImportProtectionMessage({
    existingRole: "TEACHER",
    existingIsActive: true,
    requestedIsActive: true,
    hasFuturePublishedAssignment: true
  }), null);
  assert.equal(teacherImportProtectionMessage({
    existingRole: "TEACHER",
    existingIsActive: true,
    requestedIsActive: false,
    hasFuturePublishedAssignment: false
  }), null);
});
