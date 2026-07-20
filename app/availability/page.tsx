import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { dateKey, formatDate, halfDayLabel } from "@/lib/format";
import { saveAvailabilities } from "./actions";
import { Notice } from "@/components/Notice";

export const dynamic = "force-dynamic";

const labels: Record<string, string> = {
  UNAVAILABLE: "Indisponible",
  WEAK_AVAILABLE: "Disponible si nécessaire",
  AVAILABLE: "Disponible",
  STRONG_AVAILABLE: "Disponible prioritairement"
};

export default async function AvailabilityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user } = await requireUser();
  const params = await searchParams;
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
  const [exams, availabilities] = await Promise.all([
    prisma.exam.findMany({ where: { date: { gte: today }, status: "PUBLISHED" }, orderBy: [{ date: "asc" }, { halfDay: "asc" }, { title: "asc" }] }),
    prisma.availability.findMany({ where: { userId: user.id, date: { gte: today } } })
  ]);
  const slotMap = new Map<string, { date: Date; halfDay: "AM" | "PM"; exams: typeof exams }>();
  for (const exam of exams) {
    const key = `${dateKey(exam.date)}|${exam.halfDay}`;
    const current = slotMap.get(key) ?? { date: exam.date, halfDay: exam.halfDay, exams: [] };
    current.exams.push(exam);
    slotMap.set(key, current);
  }
  const availabilityMap = new Map(availabilities.map((availability) => [`${dateKey(availability.date)}|${availability.halfDay}`, availability.status]));
  const slots = [...slotMap.entries()];
  const completion = slots.length ? Math.round((slots.filter(([key]) => availabilityMap.has(key)).length / slots.length) * 100) : 100;
  return (
    <main className="container">
      <div className="page-header"><div><h1>Mes disponibilités</h1><p className="muted">Renseignez chaque demi-journée comportant au moins un examen. L'absence de réponse reste possible mais est moins prioritaire dans l'affectation.</p></div><div style={{ minWidth: 240 }}><div className="kpi-row"><strong>Complétude</strong><span>{completion}%</span></div><div className="progress"><span style={{ width: `${completion}%` }} /></div></div></div>
      {params.saved === "1" && <Notice type="success">Vos disponibilités ont été enregistrées.</Notice>}
      <form action={saveAvailabilities} className="card">
        <div className="table-wrap"><table><thead><tr><th>Date</th><th>Demi-journée</th><th>Examens concernés</th><th>Votre réponse</th></tr></thead><tbody>{slots.map(([key, slot]) => <tr key={key}><td>{formatDate(slot.date)}</td><td>{halfDayLabel(slot.halfDay)}</td><td>{slot.exams.map((exam) => <div key={exam.id}>{exam.title} <span className="muted">· {exam.promotion} · {exam.location}</span></div>)}</td><td><select name={`availability__${dateKey(slot.date)}__${slot.halfDay}`} defaultValue={availabilityMap.get(key) || ""} aria-label={`Disponibilité ${formatDate(slot.date)} ${halfDayLabel(slot.halfDay)}`}><option value="">Non renseigné</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td></tr>)}{slots.length === 0 && <tr><td colSpan={4} className="empty">Aucun examen à venir n'a encore été importé.</td></tr>}</tbody></table></div>
        {slots.length > 0 && <div className="actions" style={{ marginTop: 18 }}><button>Enregistrer toutes les réponses</button></div>}
      </form>
    </main>
  );
}
