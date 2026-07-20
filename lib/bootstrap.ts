import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { adminEmail, smtpConfigured } from "@/lib/env";
import { createActivationToken } from "@/lib/tokens";
import { sendActivationMail } from "@/lib/mail";
import { passwordSchema } from "@/lib/password";

export type BootstrapResult = {
  configured: boolean;
  created: boolean;
  activationSent: boolean;
  message?: string;
};

export async function ensureBootstrapAdmin(): Promise<BootstrapResult> {
  const count = await prisma.user.count();
  if (count > 0) return { configured: true, created: false, activationSent: false };

  const email = adminEmail();
  if (!email) {
    return {
      configured: false,
      created: false,
      activationSent: false,
      message: "Définissez ADMIN_EMAIL ou SMTP_USER dans Vercel."
    };
  }

  const initialPassword = process.env.ADMIN_PASSWORD?.trim();
  const validInitialPassword = initialPassword
    ? passwordSchema.safeParse(initialPassword)
    : null;
  const passwordHash = validInitialPassword?.success
    ? await bcrypt.hash(initialPassword!, 12)
    : await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        name: "Administrateur",
        email,
        passwordHash,
        role: "ADMIN",
        isActive: true,
        mustChangePassword: !validInitialPassword?.success
      }
    });
  } catch (error) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) throw error;
    user = existing;
  }

  if (validInitialPassword?.success) {
    return {
      configured: true,
      created: true,
      activationSent: false,
      message: "Le compte administrateur initial a été créé."
    };
  }

  if (!smtpConfigured()) {
    return {
      configured: false,
      created: true,
      activationSent: false,
      message: "Le compte administrateur a été créé, mais le SMTP n'est pas complètement configuré."
    };
  }

  const { token } = await createActivationToken(user.id);
  await sendActivationMail(user, token);
  await prisma.user.update({
    where: { id: user.id },
    data: { activationSentAt: new Date() }
  });

  return {
    configured: true,
    created: true,
    activationSent: true,
    message: `Un lien d'activation a été envoyé à ${email}.`
  };
}

export async function resendBootstrapActivation() {
  const users = await prisma.user.findMany({ take: 2, orderBy: { createdAt: "asc" } });
  if (users.length !== 1 || users[0].role !== "ADMIN" || !users[0].mustChangePassword) {
    return { sent: false, message: "La procédure initiale n'est plus disponible." };
  }
  if (!smtpConfigured()) return { sent: false, message: "Le SMTP n'est pas configuré." };
  const { token } = await createActivationToken(users[0].id);
  await sendActivationMail(users[0], token);
  await prisma.user.update({ where: { id: users[0].id }, data: { activationSentAt: new Date() } });
  return { sent: true, message: `Lien renvoyé à ${users[0].email}.` };
}
