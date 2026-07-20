import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasStaffRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { parseTeacherRows, parseUploadedRows } from "@/lib/imports";
import { writeAudit } from "@/lib/audit";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasStaffRole(session.user.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.name) return NextResponse.redirect(new URL("/admin/imports?teacherError=file", request.url), 303);
  if (file.size > MAX_FILE_SIZE) return NextResponse.redirect(new URL("/admin/imports?teacherError=size", request.url), 303);
  try {
    const rawRows = await parseUploadedRows(file.name, Buffer.from(await file.arrayBuffer()));
    const parsed = parseTeacherRows(rawRows);
    const uniqueRows = [...new Map(parsed.data.map((row) => [row.email, row])).values()];
    const existing = await prisma.user.findMany({ where: { email: { in: uniqueRows.map((row) => row.email) } }, select: { email: true } });
    const existingSet = new Set(existing.map((user) => user.email));
    const operations = uniqueRows.map((row) => prisma.user.upsert({
      where: { email: row.email },
      update: { firstName: row.firstName, lastName: row.lastName, name: row.name, department: row.department, speciality: row.speciality, quotaAnnual: row.quotaAnnual, isActive: row.isActive },
      create: { firstName: row.firstName, lastName: row.lastName, name: row.name, email: row.email, department: row.department, speciality: row.speciality, quotaAnnual: row.quotaAnnual, isActive: row.isActive, role: "TEACHER", mustChangePassword: true }
    }));
    for (let index = 0; index < operations.length; index += 50) await prisma.$transaction(operations.slice(index, index + 50));
    const createdRows = uniqueRows.filter((row) => !existingSet.has(row.email)).length;
    const updatedRows = uniqueRows.length - createdRows;
    const status = parsed.errors.length ? "PARTIAL" : "SUCCESS";
    await prisma.importLog.create({ data: { kind: "TEACHERS", status, fileName: file.name, totalRows: rawRows.length, createdRows, updatedRows, skippedRows: parsed.data.length - uniqueRows.length, errorRows: parsed.errors.length, errors: parsed.errors.slice(0, 100), createdById: session.user.id } });
    await writeAudit({ actorId: session.user.id, action: "TEACHERS_IMPORTED", entity: "ImportLog", details: { createdRows, updatedRows, errors: parsed.errors.length } });
    return NextResponse.redirect(new URL(`/admin/imports?teachersCreated=${createdRows}&teachersUpdated=${updatedRows}&teachersErrors=${parsed.errors.length}`, request.url), 303);
  } catch (error) {
    await prisma.importLog.create({ data: { kind: "TEACHERS", status: "ERROR", fileName: file.name, totalRows: 0, errorRows: 1, errors: [{ row: 0, message: error instanceof Error ? error.message : "Erreur inconnue" }], createdById: session.user.id } });
    return NextResponse.redirect(new URL("/admin/imports?teacherError=parse", request.url), 303);
  }
}
