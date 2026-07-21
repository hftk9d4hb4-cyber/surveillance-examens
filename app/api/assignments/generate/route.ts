import { NextResponse } from "next/server";
import { getActiveApiUser, hasStaffRole } from "@/lib/guards";
import { AssignmentGenerationBlockedError, generateAssignments } from "@/lib/assignment-service";
import { isValidAcademicYear } from "@/lib/validation";

export async function POST(request: Request) {
  const actor = await getActiveApiUser();
  if (!actor || !hasStaffRole(actor.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const formData = await request.formData();
  const academicYear = String(formData.get("academicYear") || "");
  if (!isValidAcademicYear(academicYear)) return NextResponse.redirect(new URL("/assignments?error=year", request.url), 303);
  try {
    const plan = await generateAssignments(academicYear, actor.id);
    return NextResponse.redirect(new URL(`/assignments?year=${encodeURIComponent(academicYear)}&generated=${plan.assignments.length}&alerts=${plan.alerts.length}`, request.url), 303);
  } catch (error) {
    if (error instanceof AssignmentGenerationBlockedError) {
      return NextResponse.redirect(new URL(`/assignments?year=${encodeURIComponent(academicYear)}&error=notified`, request.url), 303);
    }
    throw error;
  }
}
