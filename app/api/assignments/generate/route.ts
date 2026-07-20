import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasStaffRole } from "@/lib/guards";
import { generateAssignments } from "@/lib/assignment-service";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasStaffRole(session.user.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const formData = await request.formData();
  const academicYear = String(formData.get("academicYear") || "");
  if (!/^\d{4}-\d{4}$/.test(academicYear)) return NextResponse.redirect(new URL("/assignments?error=year", request.url));
  const plan = await generateAssignments(academicYear, session.user.id);
  return NextResponse.redirect(new URL(`/assignments?year=${encodeURIComponent(academicYear)}&generated=${plan.assignments.length}&alerts=${plan.alerts.length}`, request.url), 303);
}
