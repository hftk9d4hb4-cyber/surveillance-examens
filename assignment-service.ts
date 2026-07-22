import { AvailabilityStatus, HalfDay, PrismaClient } from "@prisma/client";

type Candidate = {
  userId: string;
  name: string;
  availability: AvailabilityStatus | null;
  currentLoad: number;
  score: number;
};

function availabilityWeight(status: AvailabilityStatus | null) {
  switch (status) {
    case "STRONG_AVAILABLE": return 100;
    case "AVAILABLE": return 70;
    case "WEAK_AVAILABLE": return 35;
    case "UNAVAILABLE": return -10000;
    default: return 10;
  }
}

function deterministicNoise(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  return Math.abs(hash % 1000) / 1000;
}

export async function generateAssignments(prisma: PrismaClient) {
  const exams = await prisma.exam.findMany({ orderBy: [{ date: "asc" }, { halfDay: "asc" }] });
  const teachers = await prisma.user.findMany({ where: { role: "TEACHER", isActive: true } });

  await prisma.assignment.deleteMany({ where: { locked: false } });

  const load = new Map<string, number>();
  for (const teacher of teachers) load.set(teacher.id, 0);

  const lockedAssignments = await prisma.assignment.findMany({ where: { locked: true } });
  for (const a of lockedAssignments) load.set(a.userId, (load.get(a.userId) ?? 0) + 1);

  const alerts: string[] = [];

  for (const exam of exams) {
    const existingLocked = lockedAssignments.filter(a => a.examId === exam.id).length;
    const needed = Math.max(0, exam.requiredSupervisors - existingLocked);
    if (needed === 0) continue;

    const dayStart = new Date(exam.date);
    dayStart.setHours(0, 0, 0, 0);

    const availabilities = await prisma.availability.findMany({ where: { date: dayStart, halfDay: exam.halfDay as HalfDay } });
    const availabilityByUser = new Map(availabilities.map(a => [a.userId, a.status]));

    const busy = await prisma.assignment.findMany({
      where: { exam: { date: dayStart, halfDay: exam.halfDay } },
      select: { userId: true }
    });
    const busyIds = new Set(busy.map(b => b.userId));

    const candidates: Candidate[] = teachers
      .filter(t => !busyIds.has(t.id))
      .map(t => {
        const currentLoad = load.get(t.id) ?? 0;
        const availability = availabilityByUser.get(t.id) ?? null;
        const score = availabilityWeight(availability) - currentLoad * 12 + deterministicNoise(`${exam.id}-${t.id}`) * 5;
        return { userId: t.id, name: t.name, availability, currentLoad, score };
      })
      .filter(c => c.score > -1000)
      .sort((a, b) => b.score - a.score);

    if (candidates.length < needed) {
      alerts.push(`${exam.title} du ${dayStart.toLocaleDateString("fr-FR")} ${exam.halfDay}: ${candidates.length}/${needed} surveillants disponibles.`);
    }

    for (const selected of candidates.slice(0, needed)) {
      await prisma.assignment.create({ data: { examId: exam.id, userId: selected.userId, score: selected.score } });
      load.set(selected.userId, (load.get(selected.userId) ?? 0) + 1);
    }
  }

  return { alerts, generated: await prisma.assignment.count() };
}
