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
  const serviceOptions = [...new Set(stats.teacherRows.map((teacher) => teacher.department?.trim() || "Service non renseigné"))].sort((a, b) => a.localeCompare(b, "fr"));
  const requestedDepartment = typeof params.department === "string" ? params.department : "";
  const selectedDepartment = serviceOptions.includes(requestedDepartment) ? requestedDepartment : "";
  const visibleTeacherRows = stats.teacherRows
    .filter((teacher) => !selectedDepartment || (teacher.department?.trim() || "Service non renseigné") === selectedDepartment)
    .sort((a, b) => {
      const aOver = a.quotaAnnual !== null && a.assignmentCount > a.quotaAnnual;
      const bOver = b.quotaAnnual !== null && b.assignmentCount > b.quotaAnnual;
      if (aOver !== bOver) return aOver ? -1 : 1;
      const aRatio = a.quotaAnnual && a.quotaAnnual > 0 ? a.assignmentCount / a.quotaAnnual : -1;
      const bRatio = b.quotaAnnual && b.quotaAnnual > 0 ? b.assignmentCount / b.quotaAnnual : -1;
      return bRatio - aRatio || a.name.localeCompare(b.name, "fr");
    });
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
        <label htmlFor="statistics-department">Service pour la charge</label>
        <select id="statistics-department" name="department" defaultValue={selectedDepartment}>
          <option value="">Tous les services</option>
          {serviceOptions.map((department) => <option key={department} value={department}>{department}</option>)}
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
      <p className="muted">Les points reprennent la pondération enregistrée pour les simulations (par exemple tiers-temps). Une affectation sans pondération enregistrée compte pour 1 point. Les lignes sont classées selon le quota annuel ; le filtre par service ne modifie pas les indicateurs annuels ni la répartition globale.</p>
      <div className="table-wrap"><table><thead><tr><th>Enseignant</th><th>Service</th><th>Affectations</th><th>Points de charge</th><th>Quota annuel</th><th>Position par rapport au quota</th><th>Écart (affectations)</th></tr></thead><tbody>
        {visibleTeacherRows.map((teacher) => {
          const quotaGap = teacher.quotaAnnual === null ? null : teacher.quotaAnnual - teacher.assignmentCount;
          const status = quotaGap === null ? "Quota non défini" : quotaGap < 0 ? "Au-dessus du quota" : quotaGap === 0 ? "Quota atteint" : "Sous le quota";
          const statusColor = quotaGap === null ? "#52606d" : quotaGap < 0 ? "#b42318" : quotaGap === 0 ? "#9a6700" : "#18794e";
          const progressMax = teacher.quotaAnnual !== null && teacher.quotaAnnual > 0 ? teacher.quotaAnnual : null;
          const progressValue = progressMax === null ? 0 : Math.min(teacher.assignmentCount, progressMax);
          const quotaPercent = progressMax === null ? null : Math.round((teacher.assignmentCount / progressMax) * 100);
          return <tr key={teacher.id}>
            <th scope="row">{teacher.name}</th>
            <td>{teacher.department || "Service non renseigné"}</td>
            <td>{teacher.assignmentCount}</td>
            <td>{teacher.workloadPoints.toFixed(1)}</td>
            <td>{teacher.quotaAnnual ?? "Non défini"}</td>
            <td>
              <div style={{ color: statusColor, fontWeight: 600 }}>{status}{quotaPercent !== null ? ` · ${quotaPercent}%` : ""}</div>
              {progressMax !== null && <progress value={progressValue} max={progressMax} aria-label={`Quota de ${teacher.name} : ${teacher.assignmentCount} affectation(s) sur ${progressMax}`} />}
            </td>
            <td>{quotaGap === null ? "—" : quotaGap}</td>
          </tr>;
        })}
        {!visibleTeacherRows.length && <tr><td colSpan={7} className="empty">Aucun enseignant actif pour ce service.</td></tr>}
      </tbody></table></div>
    </section>
  </main>;
}
