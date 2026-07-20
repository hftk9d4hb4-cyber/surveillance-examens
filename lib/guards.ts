import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireUser() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: session.user!.id } });
  if (!user?.isActive) redirect("/api/auth/signout");
  return { session, user };
}

export function hasStaffRole(role?: Role | string) {
  return role === "MANAGER" || role === "ADMIN";
}

export async function requireStaff() {
  const { session, user } = await requireUser();
  if (!hasStaffRole(user.role)) redirect("/dashboard?error=access");
  return { session, user };
}

export async function requireAdmin() {
  const { session, user } = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard?error=access");
  return { session, user };
}
