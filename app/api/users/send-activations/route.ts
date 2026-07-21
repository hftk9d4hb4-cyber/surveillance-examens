import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createActivationToken } from "@/lib/tokens";
import { sendActivationMail } from "@/lib/mail";
import { writeAudit } from "@/lib/audit";
import { getActiveApiUser } from "@/lib/guards";

export async function POST(request: Request) {
  const actor = await getActiveApiUser();
  if (!actor || actor.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const formData = await request.formData();
  const specificUserId = String(formData.get("userId") || "");
  const resend = formData.get("resend") === "true";

  const users = await prisma.user.findMany({
    where: specificUserId
      ? { id: specificUserId, role: "TEACHER", isActive: true, mustChangePassword: true }
      : {
          role: "TEACHER",
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
      sent += 1;
    } catch {
      failed += 1;
    }
  }
  await writeAudit({
    actorId: actor.id,
    action: resend ? "ACTIVATIONS_RESENT" : "ACTIVATIONS_SENT",
    entity: "User",
    details: { sent, failed, specificUserId: specificUserId || null }
  });
  return NextResponse.redirect(new URL(`/admin/imports?activationSent=${sent}&activationFailed=${failed}`, request.url), 303);
}
