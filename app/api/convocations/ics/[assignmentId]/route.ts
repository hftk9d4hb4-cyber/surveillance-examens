import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateConvocationIcs } from "@/lib/calendar";

export async function GET(_request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { assignmentId } = await params;
  const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId }, include: { exam: true, user: true } });
  if (!assignment) return NextResponse.json({ error: "Affectation introuvable" }, { status: 404 });

  const role = (session.user as any).role;
  const isOwner = session.user.email === assignment.user.email;
  const isStaff = role === "MANAGER" || role === "ADMIN";
  if (!isOwner && !isStaff) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const ics = generateConvocationIcs(assignment.exam, assignment.user);
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename=convocation-${assignment.exam.date.toISOString().slice(0,10)}.ics`
    }
  });
}
