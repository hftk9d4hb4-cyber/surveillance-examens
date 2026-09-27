import Link from "next/link";
import { requireStaff } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { todayInTimeZone } from "@/lib/time";
import { planningMonth, coverageSummary } from "@/lib/planning";
import { StatCard } from "@/components/StatCard";
import styles from "./planning.module.css";

export const dynamic = "force-dynamic";

export default async function PlanningPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaff();
  const params = await searchParams;
  const today = todayInTimeZone();
  const month = planningMonth(params.month, today);
  const exams = await prisma.exam.findMany({
    where: { status: "PUBLISHED", date: { gte: month.start, lt: month.end } },
    select: { id: true, date: true, title: true, promotion: true, location: true,
      startTime: true, endTime: true, requiredSupervisors: true, _count: { select: { assignments: true } } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }, { id: "asc" }]
  });
  const summary = coverageSummary(exams);
  const label = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(month.start);
  const byDay = new Map<number, typeof exams>();
  for (const exam of exams) {
    const day = exam.date.getUTCDate();
    byDay.set(day, [...(byDay.get(day) ?? []), exam]);
  }
  return <main className="container">
    <div className="page-header">
      <div><h1>Planning des examens</h1><p className="muted">Examens publiés · couverture des surveillances</p></div>
      <Link className="button secondary" href="/dashboard">Tableau de bord</Link>
    </div>
    <section className="card" aria-labelledby="month-title">
      <div className="page-header">
        <h2 id="month-title">{label}</h2>
        <nav className="actions" aria-label="Choisir le mois">
          <Link className="button secondary" href={`?month=${month.previous}`}>Mois précédent</Link>
          <Link className="button secondary" href="/planning">Ce mois-ci</Link>
          <Link className="button secondary" href={`?month=${month.next}`}>Mois suivant</Link>
        </nav>
      </div>
      <form className="inline-form" action="/planning">
        <label htmlFor="planning-month">Aller au mois</label>
        <input id="planning-month" name="month" type="month" min="2000-01" max="2099-12" defaultValue={month.key} required />
        <button type="submit">Afficher</button>
      </form>
    </section>
    <div className="grid">
      <div className="col-4"><StatCard value={exams.length} label="examens ce mois-ci" /></div>
      <div className="col-4"><StatCard value={summary.coverage === null ? "—" : `${summary.coverage}%`} label="couverture du mois" note={`${summary.required - summary.missing} / ${summary.required} postes pourvus`} /></div>
      <div className="col-4"><StatCard value={summary.missing} label="postes à pourvoir" note={`${summary.incomplete} examen(s) incomplet(s)`} /></div>
    </div>
    <div className="page-header"><p className="muted">Vert : couverture complète · Orange : postes à pourvoir. Sur petit écran, seuls les jours avec examen sont affichés.</p><Link className="button" href="/assignments">Gérer les affectations</Link></div>
    {exams.length === 0 && <p className="card">Aucun examen publié pour ce mois.</p>}
    <section className={styles.calendar} aria-label={`Calendrier de ${label}`}>
      {["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"].map(day => <div key={day} className={styles.weekday}>{day}</div>)}
      {Array.from({ length: month.offset }, (_, i) => <div key={`blank-${i}`} className={styles.blank} aria-hidden="true" />)}
      {Array.from({ length: month.days }, (_, i) => {
        const day = i + 1;
        const date = `${month.key}-${String(day).padStart(2, "0")}`;
        const items = byDay.get(day) ?? [];
        return <article key={date} className={`${styles.day} ${items.length ? "" : styles.emptyDay}`} aria-label={date}>
          <time dateTime={date} className={styles.date} aria-current={date === today.toISOString().slice(0, 10) ? "date" : undefined}>{day} <span className={styles.mobileMonth}>{label}</span></time>
          {items.map(exam => {
            const missing = Math.max(0, exam.requiredSupervisors - exam._count.assignments);
            return <div key={exam.id} className={`${styles.exam} ${missing ? styles.incomplete : styles.complete}`}>
              <strong>{exam.startTime}–{exam.endTime}</strong>
              <h3>{exam.title}</h3><p>{exam.promotion}</p><p>{exam.location}</p>
              <p className={styles.coverage}>{exam._count.assignments}/{exam.requiredSupervisors} affectés · {missing ? `${missing} à pourvoir` : "Complet"}</p>
            </div>;
          })}
        </article>;
      })}
    </section>
  </main>;
}
