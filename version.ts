import { formatInTimeZone } from "date-fns-tz";
import { parseIsoDate } from "@/lib/validation";

export const DEFAULT_TIME_ZONE = "Europe/Paris";

/**
 * Returns the current civil date for the requested IANA time zone as a
 * date-only UTC value suitable for Prisma fields declared with @db.Date.
 *
 * Using toISOString() directly is incorrect around midnight in France because
 * it derives the day from UTC rather than from the application's civil time.
 */
export function todayInTimeZone(
  now: Date = new Date(),
  timeZone: string = DEFAULT_TIME_ZONE
): Date {
  const isoDate = formatInTimeZone(now, timeZone, "yyyy-MM-dd");
  const parsed = parseIsoDate(isoDate);
  if (!parsed) throw new Error(`Impossible de déterminer la date civile pour ${timeZone}.`);
  return parsed;
}
