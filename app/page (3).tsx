"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { writeAudit } from "@/lib/audit";
import { todayInTimeZone } from "@/lib/time";

export async function updateUser(formData: FormData) {
  const { user: actor } = await requireAdmin();
  const id = String(formData.get("id") || "");
  const role = String(formData.get("role") || "TEACHER") as Role;
  const isActive = formData.get("isActive") === "true";
  const quotaRaw = String(formData.get("quotaAnnual") || "").trim();
  const quotaValue = quotaRaw === "" ? null : Number(quotaRaw);
  const quotaAnnual = quotaValue === null || !Number.isFinite(quotaValue) ? null : Math.max(0, Math.min(100, Math.round(quotaValue)));
  if (!id || !["TEACHER", "MANAGER", "ADMIN"].includes(role)) return;
  if (id === actor.id && (!isActive || role !== "ADMIN")) redirect("/admin?error=self");

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return;
  if (target.role === "TEACHER" && (role !== "TEACHER" || !isActive)) {
    const today = todayInTimeZone();
    const futureAssignment = await prisma.assignment.findFirst({
      where: { userId: id, exam: { date: { gte: today }, status: "PUBLISHED" } },
      select: { id: true }
    });
    if (futureAssignment) redirect("/admin?error=assigned");
  }
  if (target.role === "ADMIN" && (role !== "ADMIN" || !isActive)) {
    const otherActiveAdmins = await prisma.user.count({ where: { role: "ADMIN", isActive: true, NOT: { id } } });
    if (otherActiveAdmins === 0) redirect("/admin?error=lastAdmin");
  }
  await prisma.user.update({ where: { id }, data: { role, isActive, quotaAnnual } });
  await writeAudit({ actorId: actor.id, action: "USER_UPDATED", entity: "User", entityId: id, details: { role, isActive, quotaAnnual } });
  revalidatePath("/admin");
  redirect("/admin?updated=1");
}
