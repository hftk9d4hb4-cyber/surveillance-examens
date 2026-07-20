import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createActivationToken(userId: string, ttlDays = 7) {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.activationToken.deleteMany({ where: { userId, usedAt: null } }),
    prisma.activationToken.create({ data: { userId, tokenHash, expiresAt } })
  ]);

  return { token, expiresAt };
}
