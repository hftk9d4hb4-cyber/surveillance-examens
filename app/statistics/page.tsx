import Link from "next/link";
import { requireStaff } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { academicYearForDate } from "@/lib/format";
import { todayInTimeZone } from "@/lib/time";
import { buildAnnualStatistics } from "@/lib/annual-statistics";
import { StatCard } from "@/components/StatCard";

export const dynamic = "force-dynamic";

export default async function StatisticsPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaff();
  const params = await searchParams;
  const yearsRaw = await prisma.exam.findMany({ select: { academicYear: true }, distinct: ["academicYear"], orderBy: { academicYear: "desc" } });
  const years = yearsRaw.map(({ academicYear }) => academicYear);
  const requestedYear = typeof params.year === "string" && /^\d{4}-\d{4}$/.test(params.year) ? params.year : undefined;
  const selectedYear = requestedYear && years.includes(requestedYear) ? requestedYear : years[0] || academicYearForDate(todayInTimeZone());
  const [exams, teachers] = await Promise.all([
    prisma.exam.findMany({
      where: { academicYear: selectedYear, status: "PUBLISHED" },
      select: { id: true, requiredSupervisors: true, assignments: { select: { userId: true, scoreDetails: true } } }
    }),
    prisma.user.findMany({
      where: { role: "TEACHER", isActive: true },
      select: { id: true, name: true, department: true, quotaAnnual: true },
      orderBy: [{ department: "asc" }, { lastName: "asc" }, { name: "asc" }]
    })
  ]);
  const stats = buildAnnualStatistics(exams, teachers);
  return <main className="container">
    <div className="page-header">
      <div><h1>Statistiques annuelles</h1><p className="muted">Année universitaire {selectedYear} · examens publiés et affectations enregistrées</p></div>
      <div className="actions"><a className="button secondary" href={`/api/export/statistics?year=${encodeURIComponent(selectedYear)}`}>Exporter Excel</a><Link className="button secondary" href="/assignments">Affectations</Link></div>
    </div>
    <section className="card" aria-label="Choisir l’année universitaire">
      <form action="/statistics" className="inline-form">
        <label htmlFor="statistics-year">Année universitaire</label>
        <select id="statistics-year" name="year" defaultValue={selectedYear}>
          {years.length ? years.map((year) => <option key={year} value={year}>{year}</option>) : <option value={selectedYear}>{selectedYear}</option>}
        </select>
        <button type="submit">Afficher</button>
      </form>
    </section>
    <div className="grid">
      <div className="col-3"><StatCard value={stats.examCount} label="examens publiés" /></div>
      <div className="col-3"><StatCard value={`${stats.assignedPosts} / ${stats.requiredPosts}`} label="postes pourvus" /></div>
      <div className="col-3"><StatCard value={stats.coveragePercent === null ? "—" : `${stats.coveragePercent}%`} label="couverture annuelle" /></div>
      <div className="col-3"><StatCard value={stats.missingPosts} label="postes restant à pourvoir" /></div>
    </div>
    <section className="card">
      <h2>Répartition par service</h2>
      <p className="muted">Affectations comptées sur les examens publiés de l’année sélectionnée. Les services sans libellé sont regroupés.</p>
      <div className="table-wrap"><table><thead><tr><th>Service</th><th>Enseignants actifs</th><th>Affectations</th><th>Points de charge pondérés</th><th>Moyenne par enseignant</th></tr></thead><tbody>
        {stats.departments.map((row) => <tr key={row.department}><th scope="row">{row.department}</th><td>{row.teacherCount}</td><td>{row.assignmentCount}</td><td>{row.workloadPoints.toFixed(1)}</td><td>{row.teacherCount ? (row.workloadPoints / row.teacherCount).toFixed(1) : "—"}</td></tr>)}
        {!stats.departments.length && <tr><td colSpan={5} className="empty">Aucune donnée pour cette année.</td></tr>}
      </tbody></table></div>
    </section>
    <section className="card">
      <h2>Charge par enseignant</h2>
      <p className="muted">Les points reprennent la pondération enregistrée pour les simulations (par exemple tiers-temps). Une affectation sans pondération enregistrée compte pour 1 point. Cet indicateur aide à comparer les charges ; il ne remplace pas l’examen des disponibilités et des contraintes.</p>
      <div className="table-wrap"><table><thead><tr><th>Enseignant</th><th>Service</th><th>Affectations</th><th>Points de charge</th><th>Quota annuel</th><th>Écart au quota (affectations)</th></tr></thead><tbody>
        {stats.teacherRows.map((teacher) => <tr key={teacher.id}><th scope="row">{teacher.name}</th><td>{teacher.department || "Service non renseigné"}</td><td>{teacher.assignmentCount}</td><td>{teacher.workloadPoints.toFixed(1)}</td><td>{teacher.quotaAnnual ?? "Non défini"}</td><td>{teacher.quotaAnnual === null ? "—" : teacher.quotaAnnual - teacher.assignmentCount}</td></tr>)}
        {!stats.teacherRows.length && <tr><td colSpan={6} className="empty">Aucun enseignant actif.</td></tr>}
      </tbody></table></div>
    </section>
  </main>;
}
