import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { getActiveApiUser, hasStaffRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { formatDate, halfDayLabel } from "@/lib/format";

export async function GET(request: Request) {
  const actor = await getActiveApiUser();
  if (!actor || !hasStaffRole(actor.role)) return new NextResponse("Accès refusé", { status: 403 });
  const year = new URL(request.url).searchParams.get("year") || undefined;
  const assignments = await prisma.assignment.findMany({ where: year ? { exam: { academicYear: year } } : {}, include: { exam: true, user: true, convocation: true }, orderBy: [{ exam: { date: "asc" } }, { user: { name: "asc" } }] });
  const teachers = await prisma.user.findMany({ where: { role: "TEACHER", isActive: true }, include: { assignments: { where: year ? { exam: { academicYear: year } } : {} } }, orderBy: { name: "asc" } });
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Surveillance des examens";
  const sheet = workbook.addWorksheet("Affectations");
  sheet.columns = [
    { header: "Date", key: "date", width: 13 },
    { header: "Demi-journée", key: "halfDay", width: 17 },
    { header: "Horaire", key: "time", width: 14 },
    { header: "Examen", key: "exam", width: 34 },
    { header: "Promotion", key: "promotion", width: 18 },
    { header: "Lieu", key: "location", width: 24 },
    { header: "Enseignant", key: "teacher", width: 28 },
    { header: "Email", key: "email", width: 34 },
    { header: "Source", key: "source", width: 12 },
    { header: "Verrouillée", key: "locked", width: 13 },
    { header: "Convocation", key: "convocation", width: 16 }
  ];
  for (const assignment of assignments) sheet.addRow({ date: formatDate(assignment.exam.date), halfDay: halfDayLabel(assignment.exam.halfDay), time: `${assignment.exam.startTime}-${assignment.exam.endTime}`, exam: assignment.exam.title, promotion: assignment.exam.promotion, location: assignment.exam.location, teacher: assignment.user.name, email: assignment.user.email, source: assignment.source, locked: assignment.locked ? "Oui" : "Non", convocation: assignment.convocation?.status || "PENDING" });
  const loadSheet = workbook.addWorksheet("Charges");
  loadSheet.columns = [{ header: "Enseignant", key: "name", width: 30 }, { header: "Service", key: "department", width: 26 }, { header: "Affectations", key: "count", width: 14 }, { header: "Quota annuel", key: "quota", width: 14 }];
  teachers.forEach((teacher) => loadSheet.addRow({ name: teacher.name, department: teacher.department || "", count: teacher.assignments.length, quota: teacher.quotaAnnual ?? "" }));
  for (const worksheet of workbook.worksheets) {
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF102A43" } };
    worksheet.autoFilter = { from: "A1", to: worksheet.getRow(1).getCell(worksheet.columnCount).address };
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="affectations-${year || "toutes"}.xlsx"` } });
}
