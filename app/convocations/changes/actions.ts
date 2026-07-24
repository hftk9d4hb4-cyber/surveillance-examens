"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { writeAudit } from "@/lib/audit";
import { canAccessCampaign } from "@/lib/campaign-access";
import { requireStaff } from "@/lib/guards";
import { sendConvocationCancellationMail, sendConvocationMail } from "@/lib/mail";
import {
  buildPostNotificationChangePreview,
  jsonString
} from "@/lib/post-notification-change";
import { prisma } from "@/lib/prisma";

async function loadExam(examId: string) {
  return prisma.exam.findUnique({
    where: { id: examId },
    include: {
      campaign: { select: { managerId: true } },
      assignments: {
        include: { user: true, convocation: true, acknowledgement: true },
        orderBy: { user: { name: "asc" } }
      }
    }
  });
}

async function authorizeExam(examId: string) {
  const { user } = await requireStaff();
  const exam = await loadExam(examId);
  if (!exam) redirect("/convocations/changes?error=exam");
  if (!canAccessCampaign(exam.campaign?.managerId ?? null, user)) {
    redirect("/convocations?error=access");
  }
  return { user, exam };
}

export async function previewPostNotificationChange(formData: FormData) {
  const examId = String(formData.get("examId") || "");
  if (!examId) redirect("/convocations/changes?error=exam");
  const { user, exam } = await authorizeExam(examId);
  const replacementUserId = String(formData.get("replacementUserId") || "");
  const replacement = replacementUserId
    ? await prisma.user.findFirst({
        where: { id: replacementUserId, role: "TEACHER", isActive: true },
        select: { id: true, name: true }
      })
    : null;
  const preview = buildPostNotificationChangePreview({
    type: String(formData.get("type") || ""),
    reason: String(formData.get("reason") || ""),
    assignmentId: String(formData.get("assignmentId") || ""),
    replacementUserId: replacement?.id,
    replacementUserName: replacement?.name,
    startTime: String(formData.get("startTime") || ""),
    endTime: String(formData.get("endTime") || ""),
    location: String(formData.get("location") || ""),
    exam: {
      id: exam.id,
      title: exam.title,
      updatedAt: exam.updatedAt,
      startTime: exam.startTime,
      endTime: exam.endTime,
      location: exam.location,
      assignments: exam.assignments.map((assignment) => ({
        id: assignment.id,
        userId: assignment.userId,
        userName: assignment.user.name,
        convocationStatus: assignment.convocation?.status ?? null
      }))
    }
  });
  if (!preview) redirect(`/convocations/changes?examId=${encodeURIComponent(examId)}&error=validation`);

  const change = await prisma.postNotificationChange.create({
    data: {
      examId,
      requestedById: user.id,
      type: preview.type,
      reason: preview.reason,
      payload: preview.payload,
      snapshot: preview.snapshot,
      affectedUserIds: preview.affectedUserIds,
      consequences: preview.consequences
    }
  });
  await writeAudit({
    actorId: user.id,
    action: "POST_NOTIFICATION_CHANGE_PREVIEWED",
    entity: "PostNotificationChange",
    entityId: change.id,
    details: { examId, type: preview.type }
  });
  redirect(`/convocations/changes?examId=${encodeURIComponent(examId)}&change=${encodeURIComponent(change.id)}`);
}

async function validReplacement(userId: string, exam: NonNullable<Awaited<ReturnType<typeof loadExam>>>) {
  if (!userId) return null;
  const teacher = await prisma.user.findFirst({ where: { id: userId, role: "TEACHER", isActive: true } });
  if (!teacher) return null;
  const [sameExam, sameDay, availability, annualLoad] = await Promise.all([
    prisma.assignment.findFirst({ where: { examId: exam.id, userId }, select: { id: true } }),
    prisma.assignment.findFirst({ where: { userId, exam: { date: exam.date }, NOT: { examId: exam.id } }, select: { id: true } }),
    prisma.availability.findUnique({
      where: { userId_date_halfDay: { userId, date: exam.date, halfDay: exam.halfDay } }
    }),
    prisma.assignment.count({ where: { userId, exam: { academicYear: exam.academicYear } } })
  ]);
  if (sameExam || sameDay || availability?.status === "UNAVAILABLE") return null;
  if (teacher.quotaAnnual !== null && annualLoad >= teacher.quotaAnnual) return null;
  return teacher;
}

async function sendUpdatedConvocation(assignmentId: string, reason: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { exam: true, user: true }
  });
  if (!assignment) return 1;
  try {
    const result = await sendConvocationMail(assignment.exam, assignment.user, assignment.id, reason);
    const sentAt = new Date();
    await prisma.$transaction([
      prisma.convocation.upsert({
        where: { assignmentId: assignment.id },
        update: { status: "SENT", sentAt, lastError: null, messageId: result.messageId },
        create: {
          assignmentId: assignment.id,
          examId: assignment.examId,
          userId: assignment.userId,
          status: "SENT",
          sentAt,
          messageId: result.messageId
        }
      }),
      prisma.assignmentAcknowledgement.deleteMany({ where: { assignmentId: assignment.id } })
    ]);
    return 0;
  } catch (error) {
    const lastError = error instanceof Error ? error.message.slice(0, 500) : "Erreur inconnue";
    await prisma.convocation.upsert({
      where: { assignmentId: assignment.id },
      update: { status: "ERROR", lastError },
      create: {
        assignmentId: assignment.id,
        examId: assignment.examId,
        userId: assignment.userId,
        status: "ERROR",
        lastError
      }
    });
    return 1;
  }
}

export async function applyPostNotificationChange(formData: FormData) {
  const changeId = String(formData.get("changeId") || "");
  const change = await prisma.postNotificationChange.findUnique({ where: { id: changeId } });
  if (!change || change.status !== "PREVIEW") redirect("/convocations/changes?error=change");
  const { user, exam } = await authorizeExam(change.examId);
  if (jsonString(change.snapshot, "examUpdatedAt") !== exam.updatedAt.toISOString()) {
    redirect(`/convocations/changes?examId=${encodeURIComponent(exam.id)}&error=stale`);
  }

  const assignmentId = jsonString(change.payload, "assignmentId");
  const replacementUserId = jsonString(change.payload, "replacementUserId");
  const target = assignmentId ? exam.assignments.find((assignment) => assignment.id === assignmentId) : undefined;
  const notified = exam.assignments.filter((assignment) => assignment.convocation?.status === "SENT");
  const targetRequired = ["TEACHER_REMOVED", "TEACHER_REPLACED", "LATE_UNAVAILABILITY"].includes(change.type);
  if (targetRequired && !target) {
    redirect(`/convocations/changes?examId=${encodeURIComponent(exam.id)}&error=stale`);
  }
  const replacementRequired = ["TEACHER_ADDED", "TEACHER_REPLACED", "LATE_UNAVAILABILITY"].includes(change.type);
  const replacement = replacementRequired ? await validReplacement(replacementUserId, exam) : null;
  if (replacementRequired && !replacement) {
    redirect(`/convocations/changes?examId=${encodeURIComponent(exam.id)}&error=candidate`);
  }
  const claim = await prisma.postNotificationChange.updateMany({
    where: { id: change.id, status: "PREVIEW" },
    data: { status: "APPLYING" }
  });
  if (claim.count === 0) redirect(`/convocations/changes?examId=${encodeURIComponent(exam.id)}&error=change`);
  let notificationErrors = 0;

  if (change.type === "EXAM_CANCELLED") {
    for (const assignment of notified) {
      try {
        await sendConvocationCancellationMail(exam, assignment.user, change.reason);
      } catch {
        notificationErrors += 1;
      }
    }
    await prisma.$transaction([
      prisma.assignmentAcknowledgement.deleteMany({ where: { assignment: { examId: exam.id } } }),
      prisma.exam.update({ where: { id: exam.id }, data: { status: "CANCELLED" } })
    ]);
  } else if (change.type === "SCHEDULE_OR_LOCATION" || change.type === "CORRECTION") {
    const startTime = jsonString(change.payload, "startTime");
    const endTime = jsonString(change.payload, "endTime");
    const location = jsonString(change.payload, "location");
    await prisma.$transaction([
      prisma.exam.update({ where: { id: exam.id }, data: { startTime, endTime, location } }),
      prisma.assignmentAcknowledgement.deleteMany({ where: { assignment: { examId: exam.id } } })
    ]);
    for (const assignment of notified) notificationErrors += await sendUpdatedConvocation(assignment.id, change.reason);
  } else if (change.type === "TEACHER_REMOVED") {
    try {
      await sendConvocationCancellationMail(exam, target!.user, change.reason);
    } catch {
      notificationErrors += 1;
    }
    await prisma.assignment.delete({ where: { id: target!.id } });
  } else {
    if (change.type === "TEACHER_REPLACED" || change.type === "LATE_UNAVAILABILITY") {
      try {
        await sendConvocationCancellationMail(exam, target!.user, change.reason);
      } catch {
        notificationErrors += 1;
      }
    }
    const replacementAssignment = await prisma.$transaction(async (tx) => {
      if (target) await tx.assignment.delete({ where: { id: target.id } });
      return tx.assignment.create({
        data: {
          examId: exam.id,
          userId: replacement!.id,
          source: "MANUAL",
          locked: true,
          score: 999,
          scoreDetails: { manual: true, postNotificationChangeId: change.id }
        }
      });
    });
    notificationErrors += await sendUpdatedConvocation(replacementAssignment.id, change.reason);
  }

  const status = notificationErrors ? "APPLIED_WITH_ERRORS" : "APPLIED";
  await prisma.postNotificationChange.update({
    where: { id: change.id },
    data: { status, notificationErrors, appliedAt: new Date() }
  });
  await writeAudit({
    actorId: user.id,
    action: "POST_NOTIFICATION_CHANGE_APPLIED",
    entity: "PostNotificationChange",
    entityId: change.id,
    details: {
      examId: exam.id,
      type: change.type,
      reason: change.reason,
      notificationErrors
    } as Prisma.InputJsonValue
  });
  revalidatePath("/convocations");
  revalidatePath("/assignments");
  revalidatePath("/my-convocations");
  revalidatePath("/dashboard");
  redirect(`/convocations/changes?examId=${encodeURIComponent(exam.id)}&applied=1&notificationErrors=${notificationErrors}`);
}
