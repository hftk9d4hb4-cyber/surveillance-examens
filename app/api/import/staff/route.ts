import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveApiUser } from "@/lib/guards";
import { parseUploadedRows } from "@/lib/imports";
import { fingerprint, parseStaffRows, signPreview, verifyPreview } from "@/lib/staff-import";
import { writeAudit } from "@/lib/audit";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ROWS = 5_000;

export async function POST(request: Request) {
  const actor = await getActiveApiUser();
  if (!actor || actor.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return NextResponse.json({ error: "Configuration indisponible." }, { status: 503 });
  try {
    const body = await request.formData();
    const file = body.get("file");
    const action = String(body.get("action") || "preview");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv") || !file.size || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Fichier CSV requis (maximum 5 Mo)." }, { status: 400 });
    }
    if (!(["preview", "confirm"].includes(action))) return NextResponse.json({ error: "Action invalide." }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    const raw = await parseUploadedRows(file.name, bytes);
    if (raw.length > MAX_ROWS) return NextResponse.json({ error: "Maximum 5 000 lignes." }, { status: 400 });
    const { data, errors } = parseStaffRows(raw);
    const existing = await prisma.user.findMany({ where: { email: { in: data.map(r => r.email) } }, select: { email: true } });
    const existingEmails = new Set(existing.map(r => r.email.toLowerCase()));
    const newRows = data.filter(r => !existingEmails.has(r.email));
    const already = data.filter(r => existingEmails.has(r.email));
    const summary = { total: raw.length, toCreate: newRows.length, existing: already.length, errors: errors.length, errorDetails: errors.slice(0, 50), existingDetails: already.slice(0, 50).map(r => ({ row: r.sourceRow, email: r.email })), preview: newRows.slice(0, 50).map(r => ({ name: r.name, email: r.email, department: r.department })) };

    if (action === "preview") {
      return NextResponse.json({ ...summary, token: signPreview(fingerprint(bytes), actor.id, secret) });
    }
    const token = String(body.get("token") || "");
    if (!verifyPreview(token, fingerprint(bytes), actor.id, secret)) return NextResponse.json({ error: "Prévisualisation expirée ou fichier modifié : recommencez." }, { status: 409 });
    if (errors.length) return NextResponse.json({ error: "Le fichier comporte des erreurs : corrigez-le avant confirmation.", ...summary }, { status: 422 });

    let created = 0;
    let raced = 0;
    // create, NEVER upsert: existing accounts (and privileges) must remain untouched.
    for (const row of newRows) {
      try {
        await prisma.user.create({ data: { firstName: row.firstName, lastName: row.lastName, name: row.name, email: row.email, department: row.department || null, role: "MANAGER", isActive: true, mustChangePassword: true } });
        created++;
      } catch (error) {
        // P2002: duplicate email created by another request between preview/confirmation.
        if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") raced++;
        else throw error;
      }
    }
    const log = await prisma.importLog.create({ data: { kind: "STAFF", status: raced ? "PARTIAL" : "SUCCESS", fileName: file.name, totalRows: raw.length, createdRows: created, skippedRows: already.length + raced, errorRows: 0, createdById: actor.id } });
    await writeAudit({ actorId: actor.id, action: "STAFF_IMPORTED", entity: "ImportLog", entityId: log.id, details: { created, alreadyExisting: already.length, concurrentDuplicates: raced } });
    return NextResponse.json({ success: true, created, alreadyExisting: already.length, concurrentDuplicates: raced });
  } catch (error) {
    // Never leak full uploaded data or DB error details to the client.
    console.error("Staff import failure", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Impossible de traiter le fichier. Vérifiez son format CSV." }, { status: 400 });
  }
}
