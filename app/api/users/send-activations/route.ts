import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createActivationToken } from "@/lib/tokens";
import { sendActivationMail } from "@/lib/mail";
import { writeAudit } from "@/lib/audit";
import { getActiveApiUser } from "@/lib/guards";

export async function POST(request: Request) {
  const actor = await getActiveApiUser();
  if (!actor || actor.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
  const formData = await request.formData();
  const specificUserId = String(formData.get("userId") || "");
  const resend = formData.get("resend") === "true";
  const targetRole = formData.get("targetRole") === "MANAGER" ? "MANAGER" : "TEACHER"; 

  const users = await prisma.user.findMany({
    where: specificUserId
      ? { id: specificUserId, role: targetRole, isActive: true, mustChangePassword: true }
      : {
          role: targetRole,
          isActive: true,
          mustChangePassword: true,
          ...(resend ? {} : { activationSentAt: null })
        },
    orderBy: [{ activationSentAt: "asc" }, { name: "asc" }],
    take: specificUserId ? 1 : 20
  });

  let sent = 0;
  let failed = 0;
  for (const user of users) {
    try {
      const { token } = await createActivationToken(user.id);
      await sendActivationMail(user, token);
      await prisma.user.update({ where: { id: user.id }, data: { activationSentAt: new Date() } });
      await writeAudit({ actorId: actor.id, action: "ACCOUNT_ACTIVATION_SENT", entity: "User", entityId: user.id, details: { targetRole } });
      sent += 1;
    } catch {
      await writeAudit({ actorId: actor.id, action: "ACCOUNT_ACTIVATION_FAILED", entity: "User", entityId: user.id, details: { targetRole } });
      failed += 1;
    }
  }
  await writeAudit({
    actorId: actor.id,
    action: resend ? "ACTIVATIONS_RESENT" : "ACTIVATIONS_SENT",
    entity: "User",
    details: { sent, failed, targetRole, specificUserId: specificUserId || null }
  });
  const destination = formData.get("returnTo") === "activations" ? `/admin/activations?role=${targetRole}&sent=${sent}&failed=${failed}` : `/admin/imports?activationSent=${sent}&activationFailed=${failed}`;
  return NextResponse.redirect(new URL(destination, request.url), 303);
}
