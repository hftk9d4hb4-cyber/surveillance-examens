import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(12, "Le mot de passe doit contenir au moins 12 caractères.")
  .regex(/[a-z]/, "Ajoutez une lettre minuscule.")
  .regex(/[A-Z]/, "Ajoutez une lettre majuscule.")
  .regex(/[0-9]/, "Ajoutez un chiffre.")
  .regex(/[^A-Za-z0-9]/, "Ajoutez un caractère spécial.");
