import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { academicYearForDate, formatDate, halfDayLabel } from "@/lib/format";
import { todayInTimeZone } from "@/lib/time";
import { addManualAssignment, removeAssignment, toggleAssignmentLock } from "./actions";
import { Notice } from "@/components/Notice";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

type AssignmentView = {
  id: string;
  userId: string;
  locked: boolean;
  user: { name: string };
  convocation: { status: string } | null;
};

export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff();
  const params = await searchParams;
  const yearsRaw = await prisma.exam.findMany({ select: { academicYear: true }, distinct: ["academicYear"], orderBy: { academicYear: "desc" } });
  const years = yearsRaw.map((item) => item.academicYear);
  const selectedYear = typeof params.year === "string" ? params.year : years[0] || academicYearForDate(todayInTimeZone());
  const [exams, teachers] = await Promise.all([
    prisma.exam.findMany({ where: { academicYear: selectedYear, status: "PUBLISHED" }, include: { assignments: { include: { user: true, convocation: true }, orderBy: { user: { name: "asc" } } } }, orderBy: [{ date: "asc" }, { halfDay: "asc" }, { title: "asc" }] }),
    prisma.user.findMany({ where: { role: "TEACHER", isActive: true }, include: { assignments: { where: { exam: { academicYear: selectedYear } } } }, orderBy: [{ lastName: "asc" }, { name: "asc" }] })
  ]);
  const required = exams.reduce((sum, exam) => sum + exam.requiredSupervisors, 0);
  const assigned = exams.reduce((sum, exam) => sum + Math.min(exam.assignments.length, exam.requiredSupervisors), 0);
  const coverage = required ? Math.round((assigned / required) * 100) : 100;
  return (
    <main className="container">
      <div className="page-header"><div><h1>Affectations</h1><p className="muted">L'algorithme respecte les indisponibilités, limite à une surveillance par jour, équilibre la charge et conserve les affectations verrouillées.</p></div><div><strong>Couverture : {coverage}%</strong><div className="progress" style={{ width: 240 }}><span style={{ width: `${coverage}%` }} /></div></div></div>
      {params.generated && <Notice type={Number(params.alerts || 0) > 0 ? "warning" : "success"}>{params.generated} affectation(s) générée(s). {params.alerts} examen(s) restent incomplets.</Notice>}
      {params.error === "notified" && <Notice type="error">Le calcul global est bloqué car des convocations ont déjà été envoyées pour cette année. Utilisez les corrections manuelles afin de préserver la traçabilité des convocations.</Notice>}
      {params.error === "sent" && <Notice type="error">Cette affectation possède déjà une convocation envoyée et ne peut plus être modifiée sans procédure d’annulation.</Notice>}
      {params.manual === "1" && <Notice type="success">Affectation manuelle ajoutée et verrouillée.</Notice>}
      {params.error === "unavailable" && <Notice type="error">Cet enseignant s'est déclaré indisponible pour cette session.</Notice>}
      {params.error === "sameday" && <Notice type="error">Cet enseignant a déjà une surveillance le même jour.</Notice>}
      {params.error === "quota" && <Notice type="error">Le quota annuel de cet enseignant est atteint.</Notice>}
      {params.error === "covered" && <Notice type="error">Le besoin de surveillance de cet examen est déjà entièrement couvert.</Notice>}
      {params.error === "invalid" && <Notice type="error">L’examen ou l’enseignant sélectionné n’est pas valide.</Notice>}
      <div className="card"><div className="actions"><form action="/api/assignments/generate" method="post" className="inline-form"><label htmlFor="academicYear">Année universitaire</label><select id="academicYear" name="academicYear" defaultValue={selectedYear}>{years.length ? years.map((year) => <option key={year}>{year}</option>) : <option>{selectedYear}</option>}</select><button>Calculer les affectations</button></form><a className="button secondary" href={`/api/export/assignments?year=${encodeURIComponent(selectedYear)}`}>Exporter Excel</a></div></div>
      <div className="card"><h2>Planning par examen</h2><div className="table-wrap"><table><thead><tr><th>Date</th><th>Examen</th><th>Lieu</th><th>Affectations</th><th>Couverture</th><th>Ajout manuel</th></tr></thead><tbody>{exams.map((exam) => <tr key={exam.id}><td>{formatDate(exam.date)}<br /><span className="muted">{halfDayLabel(exam.halfDay)}</span></td><td>{exam.title}<br /><span className="muted">{exam.promotion}</span></td><td>{exam.location}</td><td>{exam.assignments.map((assignment: AssignmentView) => <div key={assignment.id} style={{ marginBottom: 7 }}><strong>{assignment.user.name}</strong> {assignment.locked && <StatusBadge label="Verrouillée" tone="blue" />} <form action={toggleAssignmentLock} className="inline-form"><input type="hidden" name="id" value={assignment.id} /><button className="small secondary" disabled={assignment.convocation?.status === "SENT"}>{assignment.convocation?.status === "SENT" ? "Notifiée" : assignment.locked ? "Déverrouiller" : "Verrouiller"}</button></form> <form action={removeAssignment} className="inline-form"><input type="hidden" name="id" value={assignment.id} /><button className="small danger" disabled={assignment.convocation?.status === "SENT"}>Retirer</button></form></div>) || "—"}</td><td>{exam.assignments.length >= exam.requiredSupervisors ? <StatusBadge label={`${exam.assignments.length}/${exam.requiredSupervisors}`} tone="green" /> : <StatusBadge label={`${exam.assignments.length}/${exam.requiredSupervisors}`} tone="red" />}</td><td><form action={addManualAssignment} className="inline-form"><input type="hidden" name="examId" value={exam.id} /><select name="userId" required defaultValue=""><option value="" disabled>Choisir…</option>{teachers.filter((teacher) => !exam.assignments.some((assignment: AssignmentView) => assignment.userId === teacher.id)).map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} ({teacher.assignments.length})</option>)}</select><button className="small">Ajouter</button></form></td></tr>)}{exams.length === 0 && <tr><td colSpan={6} className="empty">Aucun examen publié pour cette année.</td></tr>}</tbody></table></div></div>
      <div className="card"><h2>Répartition par enseignant</h2><div className="table-wrap"><table className="compact"><thead><tr><th>Enseignant</th><th>Service</th><th>Affectations</th><th>Quota</th></tr></thead><tbody>{teachers.map((teacher) => <tr key={teacher.id}><td>{teacher.name}</td><td>{teacher.department || "—"}</td><td>{teacher.assignments.length}</td><td>{teacher.quotaAnnual ?? "Non défini"}</td></tr>)}</tbody></table></div></div>
    </main>
  );
}
