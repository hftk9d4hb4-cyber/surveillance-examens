"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AbsenceType, HalfDay } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { parseIsoDate } from "@/lib/validation";
import { writeAudit } from "@/lib/audit";

const absenceTypes = new Set(["VACATION","CONFERENCE","TRAINING","MISSION","PERSONAL","OTHER"]);
export async function createAbsence(formData: FormData) {
  const { user } = await requireUser();
  const type = String(formData.get("type") || "");
  const startDate = parseIsoDate(String(formData.get("startDate") || ""));
  const endDate = parseIsoDate(String(formData.get("endDate") || ""));
  const comment = String(formData.get("comment") || "").trim().slice(0, 500) || null;
  if (!absenceTypes.has(type) || !startDate || !endDate || startDate > endDate) redirect("/teacher-profile?error=absence");
  const absence = await prisma.teacherAbsence.create({ data: { userId: user.id, type: type as AbsenceType, startDate, endDate, comment } });
  await writeAudit({ actorId: user.id, action: "TEACHER_ABSENCE_CREATED", entity: "TeacherAbsence", entityId: absence.id });
  revalidatePath("/teacher-profile"); redirect("/teacher-profile?saved=absence");
}
export async function deleteAbsence(formData: FormData) {
  const { user } = await requireUser();
  const id = String(formData.get("id") || "");
  await prisma.teacherAbsence.deleteMany({ where: { id, userId: user.id } });
  await writeAudit({ actorId: user.id, action: "TEACHER_ABSENCE_DELETED", entity: "TeacherAbsence", entityId: id });
  revalidatePath("/teacher-profile");
}
export async function savePreferences(formData: FormData) {
  const { user } = await requireUser();
  const operations = [];
  for (let weekday=1; weekday<=5; weekday++) for (const halfDay of ["AM","PM"] as HalfDay[]) {
    const raw = Number(formData.get(`pref__${weekday}__${halfDay}`) || 0);
    const weight = [-1,0,1].includes(raw) ? raw : 0;
    const where = { userId_weekday_halfDay: { userId: user.id, weekday, halfDay } };
    if (weight === 0) operations.push(prisma.teacherPreference.deleteMany({ where: where.userId_weekday_halfDay }));
    else operations.push(prisma.teacherPreference.upsert({ where, update: { weight }, create: { userId: user.id, weekday, halfDay, weight } }));
  }
  await prisma.$transaction(operations);
  await writeAudit({ actorId: user.id, action: "TEACHER_PREFERENCES_UPDATED", entity: "User", entityId: user.id });
  revalidatePath("/teacher-profile"); redirect("/teacher-profile?saved=preferences");
}
