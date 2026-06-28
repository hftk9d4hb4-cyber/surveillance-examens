import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.convocation.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.user.deleteMany();

  const adminHash = await bcrypt.hash("admin123", 10);
  const teacherHash = await bcrypt.hash("enseignant123", 10);

  await prisma.user.createMany({ data: [
    { name: "Administrateur Faculté", email: "admin@faculte.fr", passwordHash: adminHash, role: "ADMIN" },
    { name: "Scolarité Examens", email: "scolarite@faculte.fr", passwordHash: adminHash, role: "MANAGER" },
    ...Array.from({ length: 12 }).map((_, i) => ({
      name: `Enseignant ${i + 1}`,
      email: `enseignant${i + 1}@faculte.fr`,
      passwordHash: teacherHash,
      role: "TEACHER" as const,
      department: i % 2 === 0 ? "CHU Nice" : "Faculté",
      speciality: ["Chirurgie", "Médecine", "Anesthésie", "Biologie"][i % 4]
    }))
  ]});

  const base = new Date();
  base.setDate(base.getDate() + 14);
  base.setHours(0,0,0,0);
  for (let i = 0; i < 6; i++) {
    const date = new Date(base);
    date.setDate(base.getDate() + i);
    await prisma.exam.create({ data: {
      title: `Examen EDN blanc ${i + 1}`,
      date,
      halfDay: i % 2 === 0 ? "AM" : "PM",
      promotion: "DFASM",
      location: `Salle ${100 + i}`,
      requiredSupervisors: 3
    }});
  }

  const teachers = await prisma.user.findMany({ where: { role: "TEACHER" } });
  for (const [idx, t] of teachers.entries()) {
    for (let i = 0; i < 6; i++) {
      const date = new Date(base);
      date.setDate(base.getDate() + i);
      await prisma.availability.create({ data: {
        userId: t.id,
        date,
        halfDay: i % 2 === 0 ? "AM" : "PM",
        status: (idx + i) % 5 === 0 ? "UNAVAILABLE" : ((idx + i) % 3 === 0 ? "STRONG_AVAILABLE" : "AVAILABLE")
      }});
    }
  }
}

main().finally(async () => prisma.$disconnect());
