type PasswordValidation =
  | { success: true; data: string }
  | { success: false; error: { issues: { message: string }[] } };

function validatePassword(value: unknown): PasswordValidation {
  if (typeof value !== "string") return { success: false, error: { issues: [{ message: "Mot de passe invalide." }] } };
  const checks: [boolean, string][] = [
    [value.length >= 12, "Le mot de passe doit contenir au moins 12 caractères."],
    [/[a-z]/.test(value), "Ajoutez une lettre minuscule."],
    [/[A-Z]/.test(value), "Ajoutez une lettre majuscule."],
    [/[0-9]/.test(value), "Ajoutez un chiffre."],
    [/[^A-Za-z0-9]/.test(value), "Ajoutez un caractère spécial."]
  ];
  const failed = checks.find(([valid]) => !valid);
  if (failed) return { success: false, error: { issues: [{ message: failed[1] }] } };
  return { success: true, data: value };
}

export const passwordSchema = { safeParse: validatePassword };
