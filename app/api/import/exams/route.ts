import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasStaffRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { parseExamRows, parseUploadedRows } from "@/lib/imports";
import { writeAudit } from "@/lib/audit";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasStaffRole(session.user.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.name) return NextResponse.redirect(new URL("/admin/imports?examError=file", request.url), 303);
  if (file.size > MAX_FILE_SIZE) return NextResponse.redirect(new URL("/admin/imports?examError=size", request.url), 303);
  try {
    const rawRows = await parseUploadedRows(file.name, Buffer.from(await file.arrayBuffer()));
    const parsed = parseExamRows(rawRows);
    let createdRows = 0;
    let updatedRows = 0;
    for (const row of parsed.data) {
      const existing = row.externalId
        ? await prisma.exam.findUnique({ where: { externalId: row.externalId } })
        : await prisma.exam.findUnique({ where: { examNaturalKey: { date: row.date, halfDay: row.halfDay, title: row.title, location: row.location } } });
      const data = { externalId: row.externalId, title: row.title, date: row.date, halfDay: row.halfDay, startTime: row.startTime, endTime: row.endTime, academicYear: row.academicYear, promotion: row.promotion, location: row.location, requiredSupervisors: row.requiredSupervisors, notes: row.notes, status: "PUBLISHED" as const };
      if (existing) {
        await prisma.exam.update({ where: { id: existing.id }, data });
        updatedRows += 1;
      } else {
        await prisma.exam.create({ data });
        createdRows += 1;
      }
    }
    const status = parsed.errors.length ? "PARTIAL" : "SUCCESS";
    await prisma.importLog.create({ data: { kind: "EXAMS", status, fileName: file.name, totalRows: rawRows.length, createdRows, updatedRows, skippedRows: 0, errorRows: parsed.errors.length, errors: parsed.errors.slice(0, 100), createdById: session.user.id } });
    await writeAudit({ actorId: session.user.id, action: "EXAMS_IMPORTED", entity: "ImportLog", details: { createdRows, updatedRows, errors: parsed.errors.length } });
    return NextResponse.redirect(new URL(`/admin/imports?examsCreated=${createdRows}&examsUpdated=${updatedRows}&examsErrors=${parsed.errors.length}`, request.url), 303);
  } catch (error) {
    await prisma.importLog.create({ data: { kind: "EXAMS", status: "ERROR", fileName: file.name, totalRows: 0, errorRows: 1, errors: [{ row: 0, message: error instanceof Error ? error.message : "Erreur inconnue" }], createdById: session.user.id } });
    return NextResponse.redirect(new URL("/admin/imports?examError=parse", request.url), 303);
  }
}
