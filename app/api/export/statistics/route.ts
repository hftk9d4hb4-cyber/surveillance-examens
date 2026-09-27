import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { getActiveApiUser, hasStaffRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { buildAnnualStatistics } from "@/lib/annual-statistics";

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
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Surveillance des examens";
  const summary = workbook.addWorksheet("Synthèse");
  summary.addRows([
    ["Année universitaire", requestedYear],
    ["Examens publiés", stats.examCount],
    ["Postes requis", stats.requiredPosts],
    ["Postes pourvus", stats.assignedPosts],
    ["Postes restant à pourvoir", stats.missingPosts],
    ["Couverture", stats.coveragePercent === null ? "Sans examen publié" : `${stats.coveragePercent}%`],
    ["Affectations", stats.totalAssignments],
    ["Note", "Points pondérés : poids enregistré sur l’affectation, ou 1 si absent. Indicateur descriptif, à interpréter avec le contexte."]
  ]);
  summary.getColumn(1).width = 34;
  summary.getColumn(2).width = 92;
  const departmentSheet = workbook.addWorksheet("Services");
  departmentSheet.columns = [
    { header: "Service", key: "department", width: 32 },
    { header: "Enseignants actifs", key: "teachers", width: 20 },
    { header: "Affectations", key: "assignments", width: 16 },
    { header: "Points de charge pondérés", key: "points", width: 25 },
    { header: "Moyenne par enseignant", key: "average", width: 24 }
  ];
  stats.departments.forEach((row) => departmentSheet.addRow({ department: row.department, teachers: row.teacherCount, assignments: row.assignmentCount, points: Number(row.workloadPoints.toFixed(1)), average: row.teacherCount ? Number((row.workloadPoints / row.teacherCount).toFixed(1)) : 0 }));
  const teacherSheet = workbook.addWorksheet("Enseignants");
  teacherSheet.columns = [
    { header: "Enseignant", key: "name", width: 32 },
    { header: "Service", key: "department", width: 30 },
    { header: "Affectations", key: "assignments", width: 16 },
    { header: "Points de charge pondérés", key: "points", width: 25 },
    { header: "Quota annuel", key: "quota", width: 16 },
    { header: "Écart au quota (affectations)", key: "gap", width: 30 }
  ];
  stats.teacherRows.forEach((teacher) => teacherSheet.addRow({
    name: teacher.name,
    department: teacher.department || "Service non renseigné",
    assignments: teacher.assignmentCount,
    points: Number(teacher.workloadPoints.toFixed(1)),
    quota: teacher.quotaAnnual ?? "Non défini",
    gap: teacher.quotaAnnual === null ? "—" : teacher.quotaAnnual - teacher.assignmentCount
  }));
  for (const worksheet of [departmentSheet, teacherSheet]) {
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF102A43" } };
    worksheet.autoFilter = { from: "A1", to: worksheet.getRow(1).getCell(worksheet.columnCount).address };
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="statistiques-${requestedYear}.xlsx"`
    }
  });
}
