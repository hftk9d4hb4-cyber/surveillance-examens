import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || process.env.SMTP_USER || "admin@example.fr").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "Changer-Ce-Mot-De-Passe-2026!";
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

  console.log(`Administrateur disponible : ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
