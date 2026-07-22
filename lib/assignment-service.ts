import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dateKey } from "@/lib/format";
import { planAssignments } from "@/lib/assignment-engine";
import { writeAudit } from "@/lib/audit";

export class AssignmentGenerationBlockedError extends Error {
  constructor(public readonly sentConvocations: number) {
    super("Des convocations ont déjà été envoyées pour cette année universitaire.");
    this.name = "AssignmentGenerationBlockedError";
  }
}

export async function generateAssignments(academicYear: string, actorId: string) {
  const sentConvocations = await prisma.convocation.count({
    where: { status: "SENT", exam: { academicYear } }
  });
  if (sentConvocations > 0) throw new AssignmentGenerationBlockedError(sentConvocations);
  const [teachers, exams, availabilities, allAssignments] = await Promise.all([
    prisma.user.findMany({
      where: { role: "TEACHER", isActive: true },
      select: { id: true, name: true, quotaAnnual: true }
    }),
    prisma.exam.findMany({
      where: { academicYear, status: "PUBLISHED" },
      orderBy: [{ date: "asc" }, { halfDay: "asc" }, { title: "asc" }]
    }),
    prisma.availability.findMany({
      where: {
        date: {
          in: await prisma.exam
            .findMany({
              where: { academicYear, status: "PUBLISHED" },
              select: { date: true }
            })
            .then((items) => items.map((item) => item.date))
        }
      }
    }),
    prisma.assignment.findMany({
      where: { exam: { academicYear } },
      include: { exam: { select: { academicYear: true } } }
    })
  ]);

  const examIds = exams.map((exam) => exam.id);
  const locked = allAssignments.filter(
    (assignment) => assignment.locked && examIds.includes(assignment.examId)
  );
  const loadByTeacher = new Map<string, number>();
  for (const assignment of locked) {
    loadByTeacher.set(
      assignment.userId,
      (loadByTeacher.get(assignment.userId) ?? 0) + 1
    );
  }

  const availabilityBySlot = new Map(
    availabilities.map((availability) => [
      `${availability.userId}|${dateKey(availability.date)}|${availability.halfDay}`,
      availability.status
    ])
  );

  const plan = planAssignments({
    teachers: teachers.map((teacher) => ({
      ...teacher,
      currentLoad: loadByTeacher.get(teacher.id) ?? 0
    })),
    exams: exams.map((exam) => ({
      id: exam.id,
      date: dateKey(exam.date),
      halfDay: exam.halfDay,
      requiredSupervisors: exam.requiredSupervisors
    })),
    availabilityBySlot,
    lockedAssignments: locked.map((assignment) => ({ examId: assignment.examId, userId: assignment.userId })),
    maxAssignmentsPerDay: 1
  });

  await prisma.$transaction(async (tx: Pick<typeof prisma, "assignment">) => {
    if (examIds.length > 0) {
      await tx.assignment.deleteMany({ where: { examId: { in: examIds }, locked: false } });
    }
    if (plan.assignments.length > 0) {
      await tx.assignment.createMany({
        data: plan.assignments.map((assignment) => ({
          examId: assignment.examId,
          userId: assignment.userId,
          score: assignment.score,
          scoreDetails: assignment.scoreDetails as Prisma.InputJsonValue,
          source: "AUTO",
          locked: false
        }))
      });
    }
  });

  await writeAudit({
    actorId,
    action: "ASSIGNMENTS_GENERATED",
    entity: "AcademicYear",
    entityId: academicYear,
    details: {
      generated: plan.assignments.length,
      alerts: plan.alerts.length,
      exams: exams.length,
      teachers: teachers.length
    }
  });

  return plan;
}
