"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { writeAudit } from "@/lib/audit";

export async function updateUser(formData: FormData) {
  const { user: actor } = await requireAdmin();
  const id = String(formData.get("id") || "");
  const role = String(formData.get("role") || "TEACHER") as Role;
  const isActive = formData.get("isActive") === "true";
  const quotaRaw = String(formData.get("quotaAnnual") || "").trim();
  const quotaAnnual = quotaRaw ? Math.max(0, Math.min(100, Number(quotaRaw))) : null;
  if (!id || !["TEACHER", "MANAGER", "ADMIN"].includes(role)) return;
  if (id === actor.id && (!isActive || role !== "ADMIN")) redirect("/admin?error=self");
  await prisma.user.update({ where: { id }, data: { role, isActive, quotaAnnual: Number.isFinite(quotaAnnual) ? quotaAnnual : null } });
  await writeAudit({ actorId: actor.id, action: "USER_UPDATED", entity: "User", entityId: id, details: { role, isActive, quotaAnnual } });
  revalidatePath("/admin");
  redirect("/admin?updated=1");
}
