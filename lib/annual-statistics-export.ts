import ExcelJS from "exceljs";
import { selectAnnualTeachers, teacherDepartmentLabel, type AnnualStatistics } from "./annual-statistics";

export function buildAnnualStatisticsWorkbook(stats: AnnualStatistics, requestedYear: string, department = "") {
  const { teacherRows, selectedDepartment } = selectAnnualTeachers(stats, department);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Surveillance des examens";
  const summary = workbook.addWorksheet("Synthèse");
  summary.addRows([
    ["Année universitaire", requestedYear],
    ["Service sélectionné — enseignants", selectedDepartment || "Tous les services"],
    ["Périmètre — Synthèse et Services", "Faculté entière"],
    ["Périmètre — Enseignants", selectedDepartment || "Tous les services"],
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
  summary.getColumn(2).alignment = { wrapText: true, vertical: "top" };
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
  teacherRows.forEach((teacher) => teacherSheet.addRow({
    name: teacher.name,
    department: teacherDepartmentLabel(teacher.department),
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
  return workbook;
}

export function annualStatisticsFilename(year: string, department = "") {
  const service = department.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  return `statistiques-${year}${department ? `-${service || "service"}` : ""}.xlsx`;
}
