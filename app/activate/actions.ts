"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { passwordSchema } from "@/lib/password";

export type ActivationState = { error: string };

export async function activateAccount(_previous: ActivationState, formData: FormData): Promise<ActivationState> {
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  if (password !== confirm) return { error: "Les deux mots de passe ne correspondent pas." };
  const validation = passwordSchema.safeParse(password);
  if (!validation.success) return { error: validation.error.issues[0]?.message || "Mot de passe invalide." };
  const tokenHash = hashToken(token);
  const activation = await prisma.activationToken.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!activation || activation.usedAt || activation.expiresAt < new Date() || !activation.user.isActive) {
    return { error: "Ce lien est invalide ou expiré. Contactez la scolarité pour en recevoir un nouveau." };
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: activation.userId }, data: { passwordHash, mustChangePassword: false } }),
    prisma.activationToken.update({ where: { id: activation.id }, data: { usedAt: new Date() } })
  ]);
  redirect("/login?activated=1");
}
