import ExcelJS from "exceljs";
import { parse as parseCsv } from "csv-parse/sync";
import { z } from "zod";
import { academicYearForDate } from "@/lib/format";

export type ImportError = { row: number; message: string };

export type TeacherImportRow = {
  firstName?: string;
  lastName?: string;
  name: string;
  email: string;
  department?: string;
  speciality?: string;
  quotaAnnual?: number;
  isActive: boolean;
};

export type ExamImportRow = {
  externalId?: string;
  title: string;
  date: Date;
  halfDay: "AM" | "PM";
  startTime: string;
  endTime: string;
  academicYear: string;
  promotion: string;
  location: string;
  requiredSupervisors: number;
  notes?: string;
};

type RawRow = Record<string, unknown>;

function normalized(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function text(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && value && "text" in value) return String((value as { text: unknown }).text).trim();
  return String(value).trim();
}

function pick(row: RawRow, aliases: string[]) {
  for (const alias of aliases) {
    if (alias in row && text(row[alias]) !== "") return row[alias];
  }
  return undefined;
}

function booleanValue(value: unknown, fallback = true) {
  const key = normalized(value);
  if (!key) return fallback;
  return !["non", "no", "false", "0", "inactif", "inactive"].includes(key);
}

function integerValue(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? Math.round(number) : undefined;
}

function timeValue(value: unknown, fallback: string) {
  if (value instanceof Date) return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
  if (typeof value === "number" && value >= 0 && value < 1) {
    const minutes = Math.round(value * 24 * 60);
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  }
  const raw = text(value).replace("h", ":");
  const match = raw.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (!match) return fallback;
  return `${match[1].padStart(2, "0")}:${(match[2] || "00").padStart(2, "0")}`;
}

export function parseDateValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  }
  if (typeof value === "number") {
    const milliseconds = Math.round((value - 25569) * 86400 * 1000);
    const date = new Date(milliseconds);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }
  const raw = text(value);
  const french = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (french) return new Date(Date.UTC(Number(french[3]), Number(french[2]) - 1, Number(french[1])));
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(`${raw}T00:00:00.000Z`);
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  return null;
}

function halfDayValue(value: unknown): "AM" | "PM" | null {
  const key = normalized(value);
  if (["am", "matin", "m", "morning"].includes(key)) return "AM";
  if (["pm", "apres_midi", "apresmidi", "a", "afternoon"].includes(key)) return "PM";
  return null;
}

const emailSchema = z.string().email();

export function parseTeacherRows(rows: RawRow[]) {
  const data: TeacherImportRow[] = [];
  const errors: ImportError[] = [];
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const firstName = text(pick(row, ["prenom", "first_name", "firstname"]));
    const lastName = text(pick(row, ["nom", "last_name", "lastname"]));
    const fullName = text(pick(row, ["nom_complet", "nom_prenom", "name", "enseignant"]));
    const name = fullName || [firstName, lastName].filter(Boolean).join(" ");
    const email = text(pick(row, ["email", "mail", "adresse_electronique"])).toLowerCase();
    if (!name) errors.push({ row: rowNumber, message: "Nom manquant." });
    if (!emailSchema.safeParse(email).success) errors.push({ row: rowNumber, message: "Adresse électronique invalide." });
    if (!name || !emailSchema.safeParse(email).success) return;
    const quota = integerValue(pick(row, ["quota_annuel", "quota", "objectif_annuel"]));
    if (quota !== undefined && (quota < 0 || quota > 100)) {
      errors.push({ row: rowNumber, message: "Le quota annuel doit être compris entre 0 et 100." });
      return;
    }
    data.push({
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      name,
      email,
      department: text(pick(row, ["service", "departement", "department"])) || undefined,
      speciality: text(pick(row, ["specialite", "speciality", "discipline"])) || undefined,
      quotaAnnual: quota,
      isActive: booleanValue(pick(row, ["actif", "active", "is_active"]), true)
    });
  });
  return { data, errors };
}

export function parseExamRows(rows: RawRow[]) {
  const data: ExamImportRow[] = [];
  const errors: ImportError[] = [];
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const title = text(pick(row, ["intitule", "titre", "title", "examen"]));
    const date = parseDateValue(pick(row, ["date", "date_examen"]));
    const halfDay = halfDayValue(pick(row, ["demi_journee", "demijournee", "half_day", "session"]));
    const promotion = text(pick(row, ["promotion", "annee_etude", "cohorte"]));
    const location = text(pick(row, ["lieu", "salle", "location"]));
    const required = integerValue(pick(row, ["nb_surveillants", "nombre_surveillants", "surveillants_requis", "required_supervisors"]));
    if (!title) errors.push({ row: rowNumber, message: "Intitulé manquant." });
    if (!date) errors.push({ row: rowNumber, message: "Date invalide." });
    if (!halfDay) errors.push({ row: rowNumber, message: "Demi-journée invalide (Matin/Après-midi ou AM/PM)." });
    if (!promotion) errors.push({ row: rowNumber, message: "Promotion manquante." });
    if (!location) errors.push({ row: rowNumber, message: "Lieu manquant." });
    if (!required || required < 1 || required > 200) errors.push({ row: rowNumber, message: "Nombre de surveillants invalide." });
    if (!title || !date || !halfDay || !promotion || !location || !required || required < 1 || required > 200) return;
    const defaultStart = halfDay === "AM" ? "08:30" : "13:30";
    const defaultEnd = halfDay === "AM" ? "12:30" : "17:30";
    data.push({
      externalId: text(pick(row, ["identifiant", "id_externe", "external_id", "code"])).trim() || undefined,
      title,
      date,
      halfDay,
      startTime: timeValue(pick(row, ["heure_debut", "debut", "start_time"]), defaultStart),
      endTime: timeValue(pick(row, ["heure_fin", "fin", "end_time"]), defaultEnd),
      academicYear: text(pick(row, ["annee_universitaire", "academic_year"])) || academicYearForDate(date),
      promotion,
      location,
      requiredSupervisors: required,
      notes: text(pick(row, ["notes", "commentaire", "commentaires"])) || undefined
    });
  });
  return { data, errors };
}

async function rowsFromXlsx(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const headerValues = sheet.getRow(1).values as unknown[];
  const headers = headerValues.slice(1).map(normalized);
  const rows: RawRow[] = [];
  sheet.eachRow((excelRow, rowNumber) => {
    if (rowNumber === 1) return;
    const values = excelRow.values as unknown[];
    const record: RawRow = {};
    headers.forEach((header, columnIndex) => {
      if (header) record[header] = values[columnIndex + 1];
    });
    if (Object.values(record).some((value) => text(value) !== "")) rows.push(record);
  });
  return rows;
}

function rowsFromCsv(buffer: Buffer) {
  const textContent = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const delimiter = textContent.split(/\r?\n/, 1)[0].includes(";") ? ";" : ",";
  const records = parseCsv(textContent, {
    columns: (headers: string[]) => headers.map(normalized),
    skip_empty_lines: true,
    trim: true,
    delimiter,
    relax_column_count: true
  }) as RawRow[];
  return records;
}

export async function parseUploadedRows(fileName: string, buffer: Buffer) {
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension === "xlsx") return rowsFromXlsx(buffer);
  if (extension === "csv") return rowsFromCsv(buffer);
  throw new Error("Format non pris en charge. Utilisez .xlsx ou .csv.");
}
