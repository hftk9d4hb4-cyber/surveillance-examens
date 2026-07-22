import { academicYearForDate } from "@/lib/format";
import { isChronologicalTimeRange, isValidAcademicYear, parseIsoDate, TIME_PATTERN } from "@/lib/validation";

export type ImportError = { row: number; message: string };

export type TeacherImportRow = {
  sourceRow: number;
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
  sourceRow: number;
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
  return Number.isFinite(number) && Number.isInteger(number) ? number : undefined;
}

function parseTimeValue(value: unknown, fallback: string) {
  if (value === undefined || value === null || text(value) === "") return { value: fallback, valid: true };
  if (value instanceof Date) {
    const result = `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
    return { value: result, valid: TIME_PATTERN.test(result) };
  }
  if (typeof value === "number" && value >= 0 && value < 1) {
    const minutes = Math.round(value * 24 * 60);
    const result = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    return { value: result, valid: TIME_PATTERN.test(result) };
  }
  const raw = text(value).toLowerCase().replace(/\s/g, "").replace("h", ":");
  const loose = raw.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (!loose) return { value: fallback, valid: false };
  const result = `${loose[1].padStart(2, "0")}:${(loose[2] || "00").padStart(2, "0")}`;
  return { value: result, valid: TIME_PATTERN.test(result) };
}

export function parseDateValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return parseIsoDate(`${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = Math.round((value - 25569) * 86400 * 1000);
    const date = new Date(milliseconds);
    return parseIsoDate(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`);
  }
  const raw = text(value);
  const french = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (french) return parseIsoDate(`${french[3]}-${french[2].padStart(2, "0")}-${french[1].padStart(2, "0")}`);
  return parseIsoDate(raw);
}

function halfDayValue(value: unknown): "AM" | "PM" | null {
  const key = normalized(value);
  if (["am", "matin", "m", "morning"].includes(key)) return "AM";
  if (["pm", "apres_midi", "apresmidi", "a", "afternoon"].includes(key)) return "PM";
  return null;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseTeacherRows(rows: RawRow[]) {
  const data: TeacherImportRow[] = [];
  const errors: ImportError[] = [];
  const seenEmails = new Set<string>();
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const firstName = text(pick(row, ["prenom", "first_name", "firstname"]));
    const lastName = text(pick(row, ["nom", "last_name", "lastname"]));
    const fullName = text(pick(row, ["nom_complet", "nom_prenom", "name", "enseignant"]));
    const name = fullName || [firstName, lastName].filter(Boolean).join(" ");
    const email = text(pick(row, ["email", "mail", "adresse_electronique"])).toLowerCase();
    const department = text(pick(row, ["service", "departement", "department"]));
    const speciality = text(pick(row, ["specialite", "speciality", "discipline"]));
    let invalid = false;
    if (!name) {
      errors.push({ row: rowNumber, message: "Nom manquant." });
      invalid = true;
    } else if (name.length > 180) {
      errors.push({ row: rowNumber, message: "Le nom ne doit pas dépasser 180 caractères." });
      invalid = true;
    }
    if (firstName.length > 100 || lastName.length > 100) {
      errors.push({ row: rowNumber, message: "Le prénom et le nom doivent chacun rester sous 100 caractères." });
      invalid = true;
    }
    if (!emailPattern.test(email) || email.length > 320) {
      errors.push({ row: rowNumber, message: "Adresse électronique invalide." });
      invalid = true;
    } else if (seenEmails.has(email)) {
      errors.push({ row: rowNumber, message: "Adresse électronique dupliquée dans le fichier." });
      invalid = true;
    }
    if (department.length > 120 || speciality.length > 120) {
      errors.push({ row: rowNumber, message: "Le service et la spécialité ne doivent pas dépasser 120 caractères." });
      invalid = true;
    }
    const quotaRaw = pick(row, ["quota_annuel", "quota", "objectif_annuel"]);
    const quota = integerValue(quotaRaw);
    if (quotaRaw !== undefined && text(quotaRaw) !== "" && quota === undefined) {
      errors.push({ row: rowNumber, message: "Le quota annuel doit être un nombre entier." });
      invalid = true;
    } else if (quota !== undefined && (quota < 0 || quota > 100)) {
      errors.push({ row: rowNumber, message: "Le quota annuel doit être compris entre 0 et 100." });
      invalid = true;
    }
    if (invalid) return;
    seenEmails.add(email);
    data.push({
      sourceRow: rowNumber,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      name,
      email,
      department: department || undefined,
      speciality: speciality || undefined,
      quotaAnnual: quota,
      isActive: booleanValue(pick(row, ["actif", "active", "is_active"]), true)
    });
  });
  return { data, errors };
}

export function parseExamRows(rows: RawRow[]) {
  const data: ExamImportRow[] = [];
  const errors: ImportError[] = [];
  const seenKeys = new Set<string>();
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const title = text(pick(row, ["intitule", "titre", "title", "examen"]));
    const date = parseDateValue(pick(row, ["date", "date_examen"]));
    const halfDay = halfDayValue(pick(row, ["demi_journee", "demijournee", "half_day", "session"]));
    const promotion = text(pick(row, ["promotion", "annee_etude", "cohorte"]));
    const location = text(pick(row, ["lieu", "salle", "location"]));
    const requiredRaw = pick(row, ["nb_surveillants", "nombre_surveillants", "surveillants_requis", "required_supervisors"]);
    const required = integerValue(requiredRaw);
    const notes = text(pick(row, ["notes", "commentaire", "commentaires"]));
    let invalid = false;
    if (!title) { errors.push({ row: rowNumber, message: "Intitulé manquant." }); invalid = true; }
    else if (title.length > 180) { errors.push({ row: rowNumber, message: "L’intitulé ne doit pas dépasser 180 caractères." }); invalid = true; }
    if (!date) { errors.push({ row: rowNumber, message: "Date invalide ou inexistante." }); invalid = true; }
    if (!halfDay) { errors.push({ row: rowNumber, message: "Demi-journée invalide (Matin/Après-midi ou AM/PM)." }); invalid = true; }
    if (!promotion) { errors.push({ row: rowNumber, message: "Promotion manquante." }); invalid = true; }
    else if (promotion.length > 120) { errors.push({ row: rowNumber, message: "La promotion ne doit pas dépasser 120 caractères." }); invalid = true; }
    if (!location) { errors.push({ row: rowNumber, message: "Lieu manquant." }); invalid = true; }
    else if (location.length > 180) { errors.push({ row: rowNumber, message: "Le lieu ne doit pas dépasser 180 caractères." }); invalid = true; }
    if (requiredRaw !== undefined && text(requiredRaw) !== "" && required === undefined) { errors.push({ row: rowNumber, message: "Le nombre de surveillants doit être entier." }); invalid = true; }
    else if (required === undefined || required < 1 || required > 200) { errors.push({ row: rowNumber, message: "Nombre de surveillants invalide." }); invalid = true; }
    if (notes.length > 2000) { errors.push({ row: rowNumber, message: "Les notes ne doivent pas dépasser 2 000 caractères." }); invalid = true; }
    if (invalid || !date || !halfDay || required === undefined) return;

    const defaultStart = halfDay === "AM" ? "08:30" : "13:30";
    const defaultEnd = halfDay === "AM" ? "12:30" : "17:30";
    const startTime = parseTimeValue(pick(row, ["heure_debut", "debut", "start_time"]), defaultStart);
    const endTime = parseTimeValue(pick(row, ["heure_fin", "fin", "end_time"]), defaultEnd);
    if (!startTime.valid || !endTime.valid || !isChronologicalTimeRange(startTime.value, endTime.value)) {
      errors.push({ row: rowNumber, message: "Horaires invalides : utilisez HH:MM et une fin postérieure au début." });
      return;
    }

    const suppliedAcademicYear = text(pick(row, ["annee_universitaire", "academic_year"]));
    const expectedAcademicYear = academicYearForDate(date);
    if (suppliedAcademicYear && (!isValidAcademicYear(suppliedAcademicYear) || suppliedAcademicYear !== expectedAcademicYear)) {
      errors.push({ row: rowNumber, message: `Année universitaire incohérente ; valeur attendue : ${expectedAcademicYear}.` });
      return;
    }

    const externalIdText = text(pick(row, ["identifiant", "id_externe", "external_id", "code"])).trim();
    if (externalIdText.length > 120) {
      errors.push({ row: rowNumber, message: "L’identifiant externe ne doit pas dépasser 120 caractères." });
      return;
    }
    const externalId = externalIdText || undefined;
    const naturalKey = externalId
      ? `external:${externalId.toLowerCase()}`
      : `natural:${date.toISOString().slice(0, 10)}|${halfDay}|${title.toLowerCase()}|${location.toLowerCase()}`;
    if (seenKeys.has(naturalKey)) {
      errors.push({ row: rowNumber, message: "Examen dupliqué dans le fichier." });
      return;
    }
    seenKeys.add(naturalKey);

    data.push({
      sourceRow: rowNumber,
      externalId,
      title,
      date,
      halfDay,
      startTime: startTime.value,
      endTime: endTime.value,
      academicYear: expectedAcademicYear,
      promotion,
      location,
      requiredSupervisors: required,
      notes: notes || undefined
    });
  });
  return { data, errors };
}

async function rowsFromXlsx(buffer: Buffer) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
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

async function rowsFromCsv(buffer: Buffer) {
  const textContent = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const delimiter = textContent.split(/\r?\n/, 1)[0].includes(";") ? ";" : ",";
  const { parse } = await import("csv-parse/sync");
  return parse(textContent, {
    columns: (headers: string[]) => headers.map(normalized),
    skip_empty_lines: true,
    trim: true,
    delimiter,
    relax_column_count: true
  }) as RawRow[];
}

export async function parseUploadedRows(fileName: string, buffer: Buffer) {
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension === "xlsx") return rowsFromXlsx(buffer);
  if (extension === "csv") return rowsFromCsv(buffer);
  throw new Error("Format non pris en charge. Utilisez .xlsx ou .csv.");
}
