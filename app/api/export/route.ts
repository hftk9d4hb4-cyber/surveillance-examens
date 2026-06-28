import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import ExcelJS from "exceljs";
import { authOptions } from "@/lib/auth";
import { hasStaffRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!hasStaffRole((session?.user as any)?.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const exams = await prisma.exam.findMany({
    include: { assignments: { include: { user: true, convocation: true } } },
    orderBy: [{ date: "asc" }, { halfDay: "asc" }]
  });

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Planning");
  ws.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Demi-journée", key: "halfDay", width: 14 },
    { header: "Examen", key: "title", width: 32 },
    { header: "Promotion", key: "promotion", width: 14 },
    { header: "Lieu", key: "location", width: 24 },
    { header: "Surveillants", key: "teachers", width: 48 },
    { header: "Convocations", key: "convocations", width: 48 },
    { header: "Couverture", key: "coverage", width: 12 }
  ];
  ws.getRow(1).font = { bold: true };
  for (const e of exams) {
    ws.addRow({
      date: e.date.toLocaleDateString("fr-FR"),
      halfDay: e.halfDay === "AM" ? "Matin" : "Après-midi",
      title: e.title,
      promotion: e.promotion,
      location: e.location,
      teachers: e.assignments.map(a => a.user.name).join(", "),
      convocations: e.assignments.map(a => `${a.user.name}: ${a.convocation?.status === "SENT" ? "envoyée" : a.convocation?.status === "ERROR" ? "erreur" : "à envoyer"}`).join(" | "),
      coverage: `${e.assignments.length}/${e.requiredSupervisors}`
    });
  }
  const buf = await workbook.xlsx.writeBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=planning-surveillances.xlsx"
    }
  });
}
