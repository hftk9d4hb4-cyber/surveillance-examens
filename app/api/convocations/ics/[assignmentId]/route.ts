import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateConvocationIcs } from "@/lib/calendar";
import { hasStaffRole } from "@/lib/guards";

export async function GET(_request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new NextResponse("Non authentifié", { status: 401 });
  const { assignmentId } = await params;
  const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId }, include: { exam: true, user: true } });
  if (!assignment) return new NextResponse("Introuvable", { status: 404 });
  if (assignment.userId !== session.user.id && !hasStaffRole(session.user.role)) return new NextResponse("Accès refusé", { status: 403 });
  const content = generateConvocationIcs(assignment.exam, assignment.user);
  return new NextResponse(content, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="convocation-${assignment.id}.ics"` } });
}
