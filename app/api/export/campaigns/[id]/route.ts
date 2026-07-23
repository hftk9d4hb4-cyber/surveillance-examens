import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { writeAudit } from "@/lib/audit";
import { canAccessCampaign } from "@/lib/campaign-access";
import { calculateCampaignKpis, loadCampaignSnapshot } from "@/lib/campaign-dashboard";
import { getActiveApiUser, hasStaffRole } from "@/lib/guards";
import {
  buildCampaignOperationalRows,
  campaignExportFileName
} from "@/lib/operational-export";
import { prisma } from "@/lib/prisma";

const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF102A43" } } as const;

function addTableSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: Array<{ header: string; key: string; width: number }>,
  rows: Array<Record<string, string | number>>
) {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = columns;
  rows.forEach((row) => sheet.addRow(row));
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = headerFill;
  sheet.getRow(1).alignment = { vertical: "middle" };
  sheet.autoFilter = { from: "A1", to: sheet.getRow(1).getCell(sheet.columnCount).address };
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) row.alignment = { vertical: "top", wrapText: true };
  });
  return sheet;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActiveApiUser();
  if (!actor || !hasStaffRole(actor.role)) return new NextResponse("Accès refusé", { status: 403 });
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      manager: { select: { name: true } },
      exams: {
        orderBy: [{ date: "asc" }, { halfDay: "asc" }, { title: "asc" }],
        include: {
          assignments: {
            orderBy: { user: { name: "asc" } },
            include: {
              user: { select: { id: true, name: true, email: true, department: true } },
              convocation: { select: { status: true, sentAt: true } },
              acknowledgement: { select: { acknowledgedAt: true } }
            }
          }
        }
      }
    }
  });
  if (!campaign) return new NextResponse("Campagne introuvable", { status: 404 });
  if (!canAccessCampaign(campaign.managerId, actor)) return new NextResponse("Accès refusé", { status: 403 });

  const snapshot = await loadCampaignSnapshot(id);
  if (!snapshot) return new NextResponse("Campagne introuvable", { status: 404 });

  const [teachers, responses, annualAssignments, alerts, changes] = await Promise.all([
    prisma.user.findMany({
      where: { role: "TEACHER", isActive: true },
      select: { id: true, name: true, email: true, department: true, quotaAnnual: true },
      orderBy: [{ lastName: "asc" }, { name: "asc" }]
    }),
    prisma.availability.findMany({
      where: { date: { gte: campaign.startDate, lte: campaign.endDate } },
      select: { userId: true },
      distinct: ["userId"]
    }),
    prisma.assignment.groupBy({
      by: ["userId"],
      where: { exam: { academicYear: campaign.academicYear } },
      _count: { _all: true }
    }),
    prisma.campaignAlert.findMany({
      where: { campaignId: id },
      orderBy: [{ resolvedAt: "asc" }, { severity: "desc" }, { createdAt: "desc" }],
      take: 1000
    }),
    prisma.postNotificationChange.findMany({
      where: { exam: { campaignId: id } },
      include: {
        requestedBy: { select: { name: true } },
        exam: { select: { title: true, date: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 1000
    })
  ]);

  const generatedAt = new Date();
  const kpis = calculateCampaignKpis(snapshot);
  const rows = buildCampaignOperationalRows({
    generatedAt,
    campaign,
    kpis,
    exams: campaign.exams,
    teachers,
    respondingTeacherIds: new Set(responses.map((response) => response.userId)),
    annualAssignmentCounts: new Map(annualAssignments.map((row) => [row.userId, row._count._all])),
    alerts,
    changes
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Surveillance des examens";
  workbook.created = generatedAt;
  workbook.modified = generatedAt;
  workbook.subject = `Pilotage opérationnel — ${campaign.name}`;

  const summary = addTableSheet(
    workbook,
    "Synthèse",
    [
      { header: "Indicateur", key: "indicator", width: 34 },
      { header: "Valeur", key: "value", width: 42 }
    ],
    rows.summary
  );
  summary.autoFilter = undefined;

  addTableSheet(workbook, "Planning", [
    { header: "Date", key: "date", width: 13 },
    { header: "Demi-journée", key: "halfDay", width: 17 },
    { header: "Horaire", key: "time", width: 14 },
    { header: "Examen", key: "exam", width: 34 },
    { header: "Promotion", key: "promotion", width: 18 },
    { header: "Lieu", key: "location", width: 24 },
    { header: "Statut", key: "status", width: 14 },
    { header: "Postes", key: "required", width: 10 },
    { header: "Affectés", key: "assigned", width: 10 },
    { header: "Manquants", key: "missing", width: 11 },
    { header: "Couverture", key: "coverage", width: 12 },
    { header: "Surveillants", key: "teachers", width: 45 },
    { header: "Convocations", key: "sent", width: 13 },
    { header: "Erreurs", key: "errors", width: 10 },
    { header: "Confirmations", key: "acknowledged", width: 14 }
  ], rows.planning);

  addTableSheet(workbook, "Affectations", [
    { header: "Date", key: "date", width: 13 },
    { header: "Demi-journée", key: "halfDay", width: 17 },
    { header: "Horaire", key: "time", width: 14 },
    { header: "Examen", key: "exam", width: 34 },
    { header: "Promotion", key: "promotion", width: 18 },
    { header: "Lieu", key: "location", width: 24 },
    { header: "Enseignant", key: "teacher", width: 28 },
    { header: "Email", key: "email", width: 34 },
    { header: "Service", key: "department", width: 24 },
    { header: "Source", key: "source", width: 14 },
    { header: "Verrouillée", key: "locked", width: 13 },
    { header: "Convocation", key: "convocation", width: 16 },
    { header: "Envoyée le", key: "sentAt", width: 19 },
    { header: "Prise de connaissance", key: "acknowledgement", width: 22 },
    { header: "Confirmée le", key: "acknowledgedAt", width: 19 }
  ], rows.assignments);

  addTableSheet(workbook, "Charges", [
    { header: "Enseignant", key: "teacher", width: 28 },
    { header: "Email", key: "email", width: 34 },
    { header: "Service", key: "department", width: 24 },
    { header: "Disponibilités", key: "availability", width: 18 },
    { header: "Campagne", key: "campaignAssignments", width: 12 },
    { header: "Année", key: "annualAssignments", width: 10 },
    { header: "Quota annuel", key: "quota", width: 14 },
    { header: "Solde quota", key: "remaining", width: 13 },
    { header: "Convocations", key: "sent", width: 14 },
    { header: "Confirmations", key: "acknowledged", width: 14 }
  ], rows.loads);

  addTableSheet(workbook, "Alertes", [
    { header: "Sévérité", key: "severity", width: 16 },
    { header: "Statut", key: "status", width: 12 },
    { header: "Type", key: "type", width: 28 },
    { header: "Titre", key: "title", width: 32 },
    { header: "Message", key: "message", width: 70 },
    { header: "Détectée le", key: "detectedAt", width: 19 },
    { header: "Résolue le", key: "resolvedAt", width: 19 }
  ], rows.alerts);

  addTableSheet(workbook, "Modifications", [
    { header: "Demandée le", key: "requestedAt", width: 19 },
    { header: "Date examen", key: "examDate", width: 14 },
    { header: "Examen", key: "exam", width: 34 },
    { header: "Type", key: "type", width: 32 },
    { header: "Statut", key: "status", width: 20 },
    { header: "Motif", key: "reason", width: 60 },
    { header: "Personnes touchées", key: "affectedTeachers", width: 19 },
    { header: "Erreurs notification", key: "notificationErrors", width: 20 },
    { header: "Demandée par", key: "requester", width: 26 },
    { header: "Appliquée le", key: "appliedAt", width: 19 }
  ], rows.changes);

  const buffer = await workbook.xlsx.writeBuffer();
  await writeAudit({
    actorId: actor.id,
    action: "CAMPAIGN_OPERATIONAL_EXPORT_GENERATED",
    entity: "Campaign",
    entityId: id,
    details: {
      fileName: campaignExportFileName(campaign.name, generatedAt),
      exams: rows.planning.length,
      assignments: rows.assignments.length,
      alerts: rows.alerts.length,
      changes: rows.changes.length
    }
  });

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${campaignExportFileName(campaign.name, generatedAt)}"`,
      "Cache-Control": "private, no-store"
    }
  });
}
