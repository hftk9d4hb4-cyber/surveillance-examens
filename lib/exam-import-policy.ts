export type ExistingExamSchedule = {
  title: string;
  date: Date;
  halfDay: "AM" | "PM";
  startTime: string;
  endTime: string;
  location: string;
};

export type ImportedExamSchedule = ExistingExamSchedule;

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Scheduling fields become immutable once an exam has assignments. Changing
 * them silently would leave existing assignments and sent calendar invitations
 * attached to a different date, session or location.
 */
export function hasProtectedScheduleChange(
  existing: ExistingExamSchedule,
  incoming: ImportedExamSchedule
) {
  return (
    existing.title.trim() !== incoming.title.trim() ||
    dateKey(existing.date) !== dateKey(incoming.date) ||
    existing.halfDay !== incoming.halfDay ||
    existing.startTime !== incoming.startTime ||
    existing.endTime !== incoming.endTime ||
    existing.location.trim() !== incoming.location.trim()
  );
}
