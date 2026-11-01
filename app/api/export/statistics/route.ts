import { NextResponse } from "next/server";
import { getActiveApiUser, hasStaffRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { buildAnnualStatistics, selectAnnualTeachers } from "@/lib/annual-statistics";

import { buildAnnualStatisticsWorkbook, annualStatisticsFilename } from "@/lib/annual-statistics-export";

export async function GET(request: Request) {
  const actor = await getActiveApiUser();
  if (!actor || !hasStaffRole(actor.role)) return new NextResponse("Accès refusé", { status: 403 });
  const requestedYear = new URL(request.url).searchParams.get("year");
  if (!requestedYear || !/^\d{4}-\d{4}$/.test(requestedYear)) return new NextResponse("Année universitaire invalide", { status: 400 });
  const [exams, teachers] = await Promise.all([
    prisma.exam.findMany({
      where: { academicYear: requestedYear, status: "PUBLISHED" },
      select: { id: true, requiredSupervisors: true, assignments: { select: { userId: true, scoreDetails: true } } }
    }),
    prisma.user.findMany({
      where: { role: "TEACHER", isActive: true },
      select: { id: true, name: true, department: true, quotaAnnual: true },
      orderBy: [{ department: "asc" }, { lastName: "asc" }, { name: "asc" }]
    })
  ]);
  const stats = buildAnnualStatistics(exams, teachers);
  const requestedDepartment = new URL(request.url).searchParams.get("department") || "";
  const { selectedDepartment } = selectAnnualTeachers(stats, requestedDepartment);
  if (requestedDepartment && !selectedDepartment) return new NextResponse("Service inconnu", { status: 400 });
  const workbook = buildAnnualStatisticsWorkbook(stats, requestedYear, selectedDepartment);
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${annualStatisticsFilename(requestedYear, selectedDepartment)}"`
    }
  });
}
