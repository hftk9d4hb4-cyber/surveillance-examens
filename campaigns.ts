export const ACADEMIC_YEAR_PATTERN = /^(\d{4})-(\d{4})$/;
export const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseIsoDate(value: string): Date | null {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;
  return date;
}

export function isValidAcademicYear(value: string) {
  const match = ACADEMIC_YEAR_PATTERN.exec(value);
  return Boolean(match && Number(match[2]) === Number(match[1]) + 1);
}

export function timeToMinutes(value: string): number | null {
  const match = TIME_PATTERN.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function isChronologicalTimeRange(startTime: string, endTime: string) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return start !== null && end !== null && end > start;
}
