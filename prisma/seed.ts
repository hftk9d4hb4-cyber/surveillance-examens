import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { passwordSchema } from "../lib/password";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || process.env.SMTP_USER || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD?.trim() || "";

  if (!email) throw new Error("ADMIN_EMAIL ou SMTP_USER est requis pour exécuter le seed.");
  if (!passwordSchema.safeParse(password).success) {
    throw new Error("ADMIN_PASSWORD doit respecter la politique de mot de passe avant d’exécuter le seed.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "Administrateur",
      email,
      passwordHash,
      role: "ADMIN",
      isActive: true,
      mustChangePassword: false
    }
  });

  console.log(`Compte administrateur initialisé : ${email}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
