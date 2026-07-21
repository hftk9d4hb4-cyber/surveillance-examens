import type { Role } from "@prisma/client";

export type TeacherImportProtectionInput = {
  existingRole: Role;
  existingIsActive: boolean;
  requestedIsActive: boolean;
  hasFuturePublishedAssignment: boolean;
};

/**
 * Existing staff accounts are never overwritten by a teacher import. An active
 * teacher with future duties must first be reassigned manually before being
 * deactivated, otherwise the planning and pending convocations become
 * inconsistent.
 */
export function teacherImportProtectionMessage(
  input: TeacherImportProtectionInput
): string | null {
  if (input.existingRole !== "TEACHER") {
    return "Cette adresse appartient à un compte gestionnaire ou administrateur et n’a pas été modifiée.";
  }

  if (
    input.existingIsActive &&
    !input.requestedIsActive &&
    input.hasFuturePublishedAssignment
  ) {
    return "Cet enseignant possède une surveillance future : réaffectez-la avant de désactiver le compte.";
  }

  return null;
}
