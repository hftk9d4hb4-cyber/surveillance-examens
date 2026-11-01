import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type StaffRow = { sourceRow: number; firstName: string; lastName: string; name: string; email: string; department: string };
export type StaffError = { row: number; message: string };

export function parseStaffRows(rows: Record<string, unknown>[]) {
  const data: StaffRow[] = [];
  const errors: StaffError[] = [];
  const seen = new Set<string>();
  rows.forEach((row, index) => {
    const sourceRow = index + 2;
    const get = (key: string) => String(row[key] ?? "").trim();
    const firstName = get("prenom");
    const lastName = get("nom");
    const name = `${firstName} ${lastName}`.trim();
    const email = get("email").toLowerCase();
    const department = get("service");
    const role = get("role").toUpperCase();
    const currentErrors: string[] = [];
    if (!firstName || !lastName) currentErrors.push("Prénom et nom obligatoires.");
    if (firstName.length > 100 || lastName.length > 100 || name.length > 180) currentErrors.push("Nom ou prénom trop long.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) currentErrors.push("Adresse électronique invalide.");
    if (department.length > 120) currentErrors.push("Service trop long (120 caractères maximum).");
    if (role && role !== "MANAGER") currentErrors.push("Seul le rôle MANAGER est autorisé.");
    if (seen.has(email)) currentErrors.push("Adresse en double dans le fichier.");
    if (email) seen.add(email);
    if (currentErrors.length) errors.push(...currentErrors.map(message => ({ row: sourceRow, message })));
    else data.push({ sourceRow, firstName, lastName, name, email, department });
  });
  return { data, errors };
}

export function fingerprint(bytes: Buffer) {
  return createHash("sha256").update(bytes).digest("hex");
}

// Sign the *file digest* rather than copying personal data into an HTML/JSON token.
export function signPreview(digest: string, actorId: string, secret: string, at = Date.now()) {
  const payload = `${actorId}.${at}.${digest}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifyPreview(token: string, digest: string, actorId: string, secret: string, now = Date.now()) {
  const parts = token.split(".");
  if (parts.length !== 4) return false;
  const [id, time, signedDigest, provided] = parts;
  const issued = Number(time);
  if (id !== actorId || signedDigest !== digest || !Number.isSafeInteger(issued) || issued > now + 60_000 || now - issued > 15 * 60_000) return false;
  const payload = `${id}.${time}.${signedDigest}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  if (!/^[a-f0-9]{64}$/.test(provided)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"));
}
