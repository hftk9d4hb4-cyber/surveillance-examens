import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseTeacherRows, parseUploadedRows, type ImportError } from "@/lib/imports";
import { writeAudit } from "@/lib/audit";
import { getActiveApiUser } from "@/lib/guards";
import { todayInTimeZone } from "@/lib/time";
import { teacherImportProtectionMessage } from "@/lib/teacher-import-policy";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ROWS = 5_000;

export async function POST(request: Request) {
  const actor = await getActiveApiUser();
  if (!actor || actor.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.name) return NextResponse.redirect(new URL("/admin/imports?teacherError=file", request.url), 303);
  if (file.size > MAX_FILE_SIZE) return NextResponse.redirect(new URL("/admin/imports?teacherError=size", request.url), 303);

  try {
    const rawRows = await parseUploadedRows(file.name, Buffer.from(await file.arrayBuffer()));
    if (rawRows.length > MAX_ROWS) throw new Error(`Le fichier dépasse la limite de ${MAX_ROWS} lignes.`);
    const parsed = parseTeacherRows(rawRows);
    const emails = parsed.data.map((row) => row.email);
    const existing = await prisma.user.findMany({ where: { email: { in: emails } } });
    const existingByEmail = new Map(existing.map((user) => [user.email, user]));
    const deactivationCandidates = parsed.data.flatMap((row) => {
      const current = existingByEmail.get(row.email);
      return current?.role === "TEACHER" && current.isActive && !row.isActive ? [current.id] : [];
    });
    const futureAssignments = deactivationCandidates.length
      ? await prisma.assignment.findMany({
          where: {
            userId: { in: deactivationCandidates },
            exam: { date: { gte: todayInTimeZone() }, status: "PUBLISHED" }
          },
          select: { userId: true },
          distinct: ["userId"]
        })
      : [];
    const futureAssignedUserIds = new Set(futureAssignments.map((assignment) => assignment.userId));
    const runtimeErrors: ImportError[] = [];
    let createdRows = 0;
    let updatedRows = 0;

    const acceptedRows = parsed.data.filter((row) => {
      const current = existingByEmail.get(row.email);
      if (!current) return true;
      const protectionMessage = teacherImportProtectionMessage({
        existingRole: current.role,
        existingIsActive: current.isActive,
        requestedIsActive: row.isActive,
        hasFuturePublishedAssignment: futureAssignedUserIds.has(current.id)
      });
      if (!protectionMessage) return true;
      runtimeErrors.push({ row: row.sourceRow, message: protectionMessage });
      return false;
    });

    for (let index = 0; index < acceptedRows.length; index += 50) {
      const batch = acceptedRows.slice(index, index + 50);
      await prisma.$transaction(
        batch.map((row) => prisma.user.upsert({
          where: { email: row.email },
          update: {
            firstName: row.firstName,
            lastName: row.lastName,
            name: row.name,
            department: row.department,
            speciality: row.speciality,
            quotaAnnual: row.quotaAnnual,
            isActive: row.isActive
          },
          create: {
            firstName: row.firstName,
            lastName: row.lastName,
            name: row.name,
            email: row.email,
            department: row.department,
            speciality: row.speciality,
            quotaAnnual: row.quotaAnnual,
            isActive: row.isActive,
            role: "TEACHER",
            mustChangePassword: true
          }
        }))
      );
    }

    for (const row of acceptedRows) {
      if (existingByEmail.has(row.email)) updatedRows += 1;
      else createdRows += 1;
    }
    const allErrors = [...parsed.errors, ...runtimeErrors];
    const status = allErrors.length ? (createdRows + updatedRows > 0 ? "PARTIAL" : "ERROR") : "SUCCESS";
    const log = await prisma.importLog.create({
      data: {
        kind: "TEACHERS",
        status,
        fileName: file.name,
        totalRows: rawRows.length,
        createdRows,
        updatedRows,
        skippedRows: runtimeErrors.length,
        errorRows: allErrors.length,
        errors: allErrors.slice(0, 100),
        createdById: actor.id
      }
    });
    await writeAudit({ actorId: actor.id, action: "TEACHERS_IMPORTED", entity: "ImportLog", entityId: log.id, details: { createdRows, updatedRows, skippedRows: runtimeErrors.length, errors: allErrors.length } });
    return NextResponse.redirect(new URL(`/admin/imports?teachersCreated=${createdRows}&teachersUpdated=${updatedRows}&teachersErrors=${allErrors.length}`, request.url), 303);
  } catch (error) {
    await prisma.importLog.create({
      data: {
        kind: "TEACHERS",
        status: "ERROR",
        fileName: file.name,
        totalRows: 0,
        errorRows: 1,
        errors: [{ row: 0, message: error instanceof Error ? error.message : "Erreur inconnue" }],
        createdById: actor.id
      }
    });
    return NextResponse.redirect(new URL("/admin/imports?teacherError=parse", request.url), 303);
  }
}
