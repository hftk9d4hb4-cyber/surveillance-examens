import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash("admin123", 10);
  const teacherHash = await bcrypt.hash("enseignant123", 10);

  await prisma.user.upsert({
    where: { email: "admin@faculte.fr" },
    update: {},
    create: {
      name: "Administrateur",
      email: "admin@faculte.fr",
      passwordHash: adminHash,
      role: Role.ADMIN
    }
  });

  await prisma.user.upsert({
    where: { email: "scolarite@faculte.fr" },
    update: {},
    create: {
      name: "Scolarité",
      email: "scolarite@faculte.fr",
      passwordHash: adminHash,
      role: Role.MANAGER
    }
  });

  await prisma.user.upsert({
    where: { email: "enseignant1@faculte.fr" },
    update: {},
    create: {
      name: "Enseignant Démo",
      email: "enseignant1@faculte.fr",
      passwordHash: teacherHash,
      role: Role.TEACHER
    }
  });
}

main().finally(() => prisma.$disconnect());
