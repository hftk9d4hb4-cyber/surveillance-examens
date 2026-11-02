export type ActivationState = "ACTIVATED" | "INACTIVE" | "NOT_SENT" | "VALID" | "EXPIRED" | "MISSING" | "FAILED";
export const activationStateLabels: Record<ActivationState, string> = { ACTIVATED: "Compte activé", INACTIVE: "Compte inactif", NOT_SENT: "Invitation à envoyer", VALID: "Lien valide, activation attendue", EXPIRED: "Lien expiré", MISSING: "Lien à renouveler", FAILED: "Échec du dernier envoi" };
export function accountActivationState(user: { isActive: boolean; mustChangePassword: boolean; hasPassword: boolean; activationSentAt: Date | null; latestToken: { expiresAt: Date; usedAt: Date | null } | null; lastDelivery?: string }, now = new Date()): ActivationState {
  if (!user.isActive) return "INACTIVE";
  if (!user.mustChangePassword && user.hasPassword) return "ACTIVATED";
  if (user.lastDelivery === "ACCOUNT_ACTIVATION_FAILED") return "FAILED";
  if (user.latestToken && !user.latestToken.usedAt) return user.latestToken.expiresAt <= now ? "EXPIRED" : "VALID";
  return user.activationSentAt ? "MISSING" : "NOT_SENT";
}
