import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasStaffRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { generateAssignments } from "@/lib/assignment";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!hasStaffRole((session?.user as any)?.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  await generateAssignments(prisma);
  return NextResponse.redirect(new URL("/assignments", request.url));
}
