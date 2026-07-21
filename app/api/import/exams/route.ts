import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseExamRows, parseUploadedRows, type ImportError } from "@/lib/imports";
import { writeAudit } from "@/lib/audit";
import { getActiveApiUser, hasStaffRole } from "@/lib/guards";
import { hasProtectedScheduleChange } from "@/lib/exam-import-policy";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ROWS = 5_000;

export async function POST(request: Request) {
  const actor = await getActiveApiUser();
  if (!actor || !hasStaffRole(actor.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.name) {
    return NextResponse.redirect(new URL("/admin/imports?examError=file", request.url), 303);
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.redirect(new URL("/admin/imports?examError=size", request.url), 303);
  }

  try {
    const rawRows = await parseUploadedRows(file.name, Buffer.from(await file.arrayBuffer()));
    if (rawRows.length > MAX_ROWS) {
      throw new Error(`Le fichier dépasse la limite de ${MAX_ROWS} lignes.`);
    }

    const parsed = parseExamRows(rawRows);
    const runtimeErrors: ImportError[] = [];
    let createdRows = 0;
    let updatedRows = 0;

    for (const row of parsed.data) {
      try {
        const existing = row.externalId
          ? await prisma.exam.findUnique({
              where: { externalId: row.externalId },
              include: { _count: { select: { assignments: true } } }
            })
          : await prisma.exam.findUnique({
              where: {
                examNaturalKey: {
                  date: row.date,
                  halfDay: row.halfDay,
                  title: row.title,
                  location: row.location
                }
              },
              include: { _count: { select: { assignments: true } } }
            });

        if (existing && existing._count.assignments > 0) {
          if (hasProtectedScheduleChange(existing, row)) {
            runtimeErrors.push({
              row: row.sourceRow,
              message: "Examen déjà affecté : la date, la session, l’horaire, le lieu ou l’intitulé ne peuvent plus être modifiés par import."
            });
            continue;
          }
          if (row.requiredSupervisors < existing._count.assignments) {
            runtimeErrors.push({
              row: row.sourceRow,
              message: `Le nombre de surveillants requis ne peut pas être inférieur aux ${existing._count.assignments} affectations existantes.`
            });
            continue;
          }
        }

        const data = {
          externalId: row.externalId,
          title: row.title,
          date: row.date,
          halfDay: row.halfDay,
          startTime: row.startTime,
          endTime: row.endTime,
          academicYear: row.academicYear,
          promotion: row.promotion,
          location: row.location,
          requiredSupervisors: row.requiredSupervisors,
          notes: row.notes,
          status: "PUBLISHED" as const
        };

        if (existing) {
          await prisma.exam.update({ where: { id: existing.id }, data });
          updatedRows += 1;
        } else {
          await prisma.exam.create({ data });
          createdRows += 1;
        }
      } catch (error) {
        const duplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
        runtimeErrors.push({
          row: row.sourceRow,
          message: duplicate
            ? "Un autre examen utilise déjà cet identifiant ou cette combinaison date/session/intitulé/lieu."
            : "La ligne n’a pas pu être enregistrée."
        });
      }
    }

    const allErrors = [...parsed.errors, ...runtimeErrors];
    const status = allErrors.length
      ? (createdRows + updatedRows > 0 ? "PARTIAL" : "ERROR")
      : "SUCCESS";

    const log = await prisma.importLog.create({
      data: {
        kind: "EXAMS",
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

    await writeAudit({
      actorId: actor.id,
      action: "EXAMS_IMPORTED",
      entity: "ImportLog",
      entityId: log.id,
      details: { createdRows, updatedRows, skippedRows: runtimeErrors.length, errors: allErrors.length }
    });

    return NextResponse.redirect(
      new URL(
        `/admin/imports?examsCreated=${createdRows}&examsUpdated=${updatedRows}&examsErrors=${allErrors.length}`,
        request.url
      ),
      303
    );
  } catch (error) {
    await prisma.importLog.create({
      data: {
        kind: "EXAMS",
        status: "ERROR",
        fileName: file.name,
        totalRows: 0,
        errorRows: 1,
        errors: [{ row: 0, message: error instanceof Error ? error.message : "Erreur inconnue" }],
        createdById: actor.id
      }
    });
    return NextResponse.redirect(new URL("/admin/imports?examError=parse", request.url), 303);
  }
}
