import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasStaffRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { createActivationToken } from "@/lib/tokens";
import { sendActivationMail } from "@/lib/mail";
import { writeAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasStaffRole(session.user.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const formData = await request.formData();
  const specificUserId = String(formData.get("userId") || "");
  const users = await prisma.user.findMany({ where: specificUserId ? { id: specificUserId, isActive: true } : { role: "TEACHER", isActive: true, mustChangePassword: true }, orderBy: { name: "asc" }, take: specificUserId ? 1 : 20 });
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
  await writeAudit({ actorId: session.user.id, action: "ACTIVATIONS_SENT", entity: "User", details: { sent, failed, specificUserId: specificUserId || null } });
  return NextResponse.redirect(new URL(`/admin/imports?activationSent=${sent}&activationFailed=${failed}`, request.url), 303);
}
