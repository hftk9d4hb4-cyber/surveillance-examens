import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dateKey } from "@/lib/format";
import { DEFAULT_ENGINE_WEIGHTS, planAssignments, type AssignmentPlan, type EngineWeights } from "@/lib/assignment-engine";
import { writeAudit } from "@/lib/audit";

export class AssignmentGenerationBlockedError extends Error {
  constructor(public readonly sentConvocations: number) {
    super("Des convocations ont déjà été envoyées pour cette année universitaire.");
    this.name = "AssignmentGenerationBlockedError";
  }
}

function isExtraTimeExam(title: string, notes: string | null) {
  return /tiers?[- ]?temps|temps major[ée]|am[ée]nagement/i.test(`${title} ${notes ?? ""}`);
}

function enumerateDateKeys(start: Date, end: Date) {
  const values: string[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const final = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (cursor <= final) {
    values.push(dateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return values;
}

async function assertNoSentConvocations(academicYear: string) {
  const sentConvocations = await prisma.convocation.count({
    where: { status: "SENT", exam: { academicYear } }
  });
  if (sentConvocations > 0) throw new AssignmentGenerationBlockedError(sentConvocations);
}

async function loadConfiguration(academicYear: string) {
  const config = await prisma.assignmentEngineConfig.findUnique({ where: { academicYear } });
  return {
    weights: {
      availability: config?.availabilityWeight ?? DEFAULT_ENGINE_WEIGHTS.availability,
      quota: config?.quotaWeight ?? DEFAULT_ENGINE_WEIGHTS.quota,
      fairness: config?.fairnessWeight ?? DEFAULT_ENGINE_WEIGHTS.fairness,
      recency: config?.recencyWeight ?? DEFAULT_ENGINE_WEIGHTS.recency,
      preference: config?.preferenceWeight ?? DEFAULT_ENGINE_WEIGHTS.preference,
      extraTimeMultiplier: config?.extraTimeMultiplier ?? DEFAULT_ENGINE_WEIGHTS.extraTimeMultiplier
    } satisfies EngineWeights,
    maxAssignmentsPerDay: config?.maxAssignmentsPerDay ?? 1
  };
}

export async function buildAssignmentPlan(academicYear: string): Promise<{ plan: AssignmentPlan; parameters: { weights: EngineWeights; maxAssignmentsPerDay: number } }> {
  const configuration = await loadConfiguration(academicYear);
  const exams = await prisma.exam.findMany({
    where: { academicYear, status: "PUBLISHED" },
    orderBy: [{ date: "asc" }, { halfDay: "asc" }, { title: "asc" }]
  });
  const examDates = exams.map((exam) => exam.date);
  const [teachers, availabilities, absences, preferences, assignments] = await Promise.all([
    prisma.user.findMany({
      where: { role: "TEACHER", isActive: true },
      select: { id: true, name: true, quotaAnnual: true }
    }),
    prisma.availability.findMany({ where: { date: { in: examDates } } }),
    prisma.teacherAbsence.findMany({
      where: examDates.length ? { startDate: { lte: examDates[examDates.length - 1] }, endDate: { gte: examDates[0] } } : { id: "__none__" }
    }),
    prisma.teacherPreference.findMany(),
    prisma.assignment.findMany({
      where: { exam: { academicYear } },
      include: { exam: { select: { date: true, title: true, notes: true } } }
    })
  ]);

  const locked = assignments.filter((assignment) => assignment.locked && exams.some((exam) => exam.id === assignment.examId));
  const allLoadByTeacher = new Map<string, number>();
  const weightedLoadByTeacher = new Map<string, number>();
  const lastAssignmentByTeacher = new Map<string, string>();
  for (const assignment of assignments) {
    allLoadByTeacher.set(assignment.userId, (allLoadByTeacher.get(assignment.userId) ?? 0) + 1);
    const weight = isExtraTimeExam(assignment.exam.title, assignment.exam.notes) ? configuration.weights.extraTimeMultiplier : 1;
    weightedLoadByTeacher.set(assignment.userId, (weightedLoadByTeacher.get(assignment.userId) ?? 0) + weight);
    const key = dateKey(assignment.exam.date);
    if (!lastAssignmentByTeacher.get(assignment.userId) || key > lastAssignmentByTeacher.get(assignment.userId)!) lastAssignmentByTeacher.set(assignment.userId, key);
  }

  const availabilityBySlot = new Map(availabilities.map((item) => [`${item.userId}|${dateKey(item.date)}|${item.halfDay}`, item.status]));
  const absenceSlots = new Set<string>();
  for (const absence of absences) {
    for (const key of enumerateDateKeys(absence.startDate, absence.endDate)) {
      absenceSlots.add(`${absence.userId}|${key}|AM`);
      absenceSlots.add(`${absence.userId}|${key}|PM`);
    }
  }
  const preferenceBySlot = new Map(preferences.map((item) => [`${item.userId}|${item.weekday}|${item.halfDay}`, item.weight]));

  const plan = planAssignments({
    teachers: teachers.map((teacher) => ({
      ...teacher,
      currentLoad: allLoadByTeacher.get(teacher.id) ?? 0,
      weightedLoad: weightedLoadByTeacher.get(teacher.id) ?? 0,
      lastAssignmentDate: lastAssignmentByTeacher.get(teacher.id) ?? null
    })),
    exams: exams.map((exam) => ({
      id: exam.id,
      date: dateKey(exam.date),
      halfDay: exam.halfDay,
      requiredSupervisors: exam.requiredSupervisors,
      extraTime: isExtraTimeExam(exam.title, exam.notes)
    })),
    availabilityBySlot,
    absenceSlots,
    preferenceBySlot,
    lockedAssignments: locked.map((assignment) => ({ examId: assignment.examId, userId: assignment.userId })),
    maxAssignmentsPerDay: configuration.maxAssignmentsPerDay,
    weights: configuration.weights
  });
  return { plan, parameters: configuration };
}

export async function simulateAssignments(academicYear: string, actorId: string) {
  await assertNoSentConvocations(academicYear);
  const { plan, parameters } = await buildAssignmentPlan(academicYear);
  const simulation = await prisma.assignmentSimulation.create({
    data: {
      academicYear,
      createdById: actorId,
      parameters: parameters as unknown as Prisma.InputJsonValue,
      result: plan as unknown as Prisma.InputJsonValue,
      anomalyCount: plan.anomalies.length,
      assignmentCount: plan.assignments.length
    }
  });
  await writeAudit({
    actorId,
    action: "ASSIGNMENT_SIMULATION_CREATED",
    entity: "AssignmentSimulation",
    entityId: simulation.id,
    details: { academicYear, assignments: plan.assignments.length, anomalies: plan.anomalies.length, fairnessIndex: plan.fairnessIndex }
  });
  return { simulation, plan };
}

export async function validateAssignmentSimulation(simulationId: string, actorId: string) {
  const simulation = await prisma.assignmentSimulation.findUnique({ where: { id: simulationId } });
  if (!simulation || simulation.status !== "PREVIEW") throw new Error("Simulation introuvable ou déjà validée.");
  await assertNoSentConvocations(simulation.academicYear);
  const plan = simulation.result as unknown as AssignmentPlan;
  const exams = await prisma.exam.findMany({ where: { academicYear: simulation.academicYear, status: "PUBLISHED" }, select: { id: true } });
  const examIds = exams.map((exam) => exam.id);
  await prisma.$transaction(async (tx) => {
    await tx.assignment.deleteMany({ where: { examId: { in: examIds }, locked: false } });
    for (const assignment of plan.assignments) {
      await tx.assignment.upsert({
        where: { examId_userId: { examId: assignment.examId, userId: assignment.userId } },
        update: {
          score: assignment.score,
          scoreDetails: assignment.scoreDetails as unknown as Prisma.InputJsonValue,
          source: "AUTO",
          locked: false
        },
        create: {
          examId: assignment.examId,
          userId: assignment.userId,
          score: assignment.score,
          scoreDetails: assignment.scoreDetails as unknown as Prisma.InputJsonValue,
          source: "AUTO",
          locked: false
        }
      });
    }

    const persistedCount = await tx.assignment.count({
      where: { examId: { in: examIds }, locked: false, source: "AUTO" }
    });
    if (persistedCount !== plan.assignments.length) {
      throw new Error("Les affectations n'ont pas toutes été enregistrées.");
    }
    await tx.assignmentSimulation.update({ where: { id: simulationId }, data: { status: "VALIDATED", validatedAt: new Date() } });
  });
  await writeAudit({ actorId, action: "ASSIGNMENT_SIMULATION_VALIDATED", entity: "AssignmentSimulation", entityId: simulationId, details: { academicYear: simulation.academicYear, generated: plan.assignments.length } });
  return plan;
}

export async function generateAssignments(academicYear: string, actorId: string) {
  const { simulation } = await simulateAssignments(academicYear, actorId);
  return validateAssignmentSimulation(simulation.id, actorId);
}
