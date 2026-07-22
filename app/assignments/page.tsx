import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { academicYearForDate, formatDate, halfDayLabel } from "@/lib/format";
import { todayInTimeZone } from "@/lib/time";
import type { AssignmentPlan } from "@/lib/assignment-engine";
import { addManualAssignment, createAssignmentSimulation, removeAssignment, saveAssignmentSettings, toggleAssignmentLock, validateSimulationAction } from "./actions";
import { Notice } from "@/components/Notice";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

type AssignmentView = { id: string; userId: string; locked: boolean; score: number; scoreDetails: unknown; user: { name: string }; convocation: { status: string } | null };

export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff();
  const params = await searchParams;
  const yearsRaw = await prisma.exam.findMany({ select: { academicYear: true }, distinct: ["academicYear"], orderBy: { academicYear: "desc" } });
  const years = yearsRaw.map((item) => item.academicYear);
  const selectedYear = typeof params.year === "string" ? params.year : years[0] || academicYearForDate(todayInTimeZone());
  const simulationId = typeof params.simulation === "string" ? params.simulation : undefined;
  const [exams, teachers, settings, simulation] = await Promise.all([
    prisma.exam.findMany({ where: { academicYear: selectedYear, status: "PUBLISHED" }, include: { assignments: { include: { user: true, convocation: true }, orderBy: { user: { name: "asc" } } } }, orderBy: [{ date: "asc" }, { halfDay: "asc" }, { title: "asc" }] }),
    prisma.user.findMany({ where: { role: "TEACHER", isActive: true }, include: { assignments: { where: { exam: { academicYear: selectedYear } } } }, orderBy: [{ lastName: "asc" }, { name: "asc" }] }),
    prisma.assignmentEngineConfig.findUnique({ where: { academicYear: selectedYear } }),
    simulationId ? prisma.assignmentSimulation.findUnique({ where: { id: simulationId } }) : prisma.assignmentSimulation.findFirst({ where: { academicYear: selectedYear, status: "PREVIEW" }, orderBy: { createdAt: "desc" } })
  ]);
  const preview = simulation?.result as unknown as AssignmentPlan | undefined;
  const required = exams.reduce((sum, exam) => sum + exam.requiredSupervisors, 0);
  const assigned = exams.reduce((sum, exam) => sum + Math.min(exam.assignments.length, exam.requiredSupervisors), 0);
  const coverage = required ? Math.round((assigned / required) * 100) : 100;
  const examName = new Map(exams.map((exam) => [exam.id, exam.title]));
  const teacherName = new Map(teachers.map((teacher) => [teacher.id, teacher.name]));

  return <main className="container">
    <div className="page-header"><div><h1>Affectations</h1><p className="muted">Simulation explicable, validation différée, contraintes bloquantes et pondération renforcée des examens avec tiers-temps.</p></div><div><strong>Couverture validée : {coverage}%</strong><div className="progress" style={{ width: 240 }}><span style={{ width: `${coverage}%` }} /></div></div></div>
    {params.settings === "1" && <Notice type="success">Paramètres du moteur enregistrés.</Notice>}
    {params.validated === "1" && <Notice type="success">Simulation validée et affectations enregistrées.</Notice>}
    {params.error === "notified" && <Notice type="error">Le calcul est bloqué car des convocations ont déjà été envoyées.</Notice>}
    {params.error === "sent" && <Notice type="error">Cette affectation a déjà été notifiée.</Notice>}
    {params.manual === "1" && <Notice type="success">Affectation manuelle ajoutée et verrouillée.</Notice>}

    <div className="card"><h2>1. Paramètres du moteur</h2><form action={saveAssignmentSettings} className="form-grid">
      <input type="hidden" name="academicYear" value={selectedYear} />
      <label>Disponibilité <input name="availabilityWeight" type="number" min="0" defaultValue={settings?.availabilityWeight ?? 35} /></label>
      <label>Quota restant <input name="quotaWeight" type="number" min="0" defaultValue={settings?.quotaWeight ?? 25} /></label>
      <label>Équité <input name="fairnessWeight" type="number" min="0" defaultValue={settings?.fairnessWeight ?? 20} /></label>
      <label>Ancienneté de la dernière surveillance <input name="recencyWeight" type="number" min="0" defaultValue={settings?.recencyWeight ?? 10} /></label>
      <label>Préférences <input name="preferenceWeight" type="number" min="0" defaultValue={settings?.preferenceWeight ?? 10} /></label>
      <label>Coefficient tiers-temps <input name="extraTimeMultiplier" type="number" min="1" max="3" step="0.1" defaultValue={settings?.extraTimeMultiplier ?? 1.5} /></label>
      <label>Maximum par jour <input name="maxAssignmentsPerDay" type="number" min="1" max="3" defaultValue={settings?.maxAssignmentsPerDay ?? 1} /></label>
      <div className="actions"><button>Enregistrer les paramètres</button></div>
    </form></div>

    <div className="card"><h2>2. Simuler avant validation</h2><div className="actions"><form action={createAssignmentSimulation} className="inline-form"><label htmlFor="academicYear">Année universitaire</label><select id="academicYear" name="academicYear" defaultValue={selectedYear}>{years.length ? years.map((year) => <option key={year}>{year}</option>) : <option>{selectedYear}</option>}</select><button>Calculer une simulation</button></form><a className="button secondary" href={`/api/export/assignments?year=${encodeURIComponent(selectedYear)}`}>Exporter les affectations validées</a></div></div>

    {simulation && preview && <div className="card"><div className="page-header"><div><h2>Prévisualisation</h2><p className="muted">Aucune affectation n’est écrite avant validation.</p></div><div><StatusBadge label={`Équité ${preview.fairnessIndex}/100`} tone={preview.fairnessIndex >= 75 ? "green" : "amber"} /></div></div>
      <p><strong>{preview.assignments.length}</strong> propositions · <strong>{preview.anomalies.length}</strong> anomalie(s).</p>
      {preview.anomalies.length > 0 && <Notice type="warning">{preview.anomalies.map((item) => item.message).join(" ")}</Notice>}
      <div className="table-wrap"><table><thead><tr><th>Examen</th><th>Enseignant proposé</th><th>Score</th><th>Explication</th></tr></thead><tbody>{preview.assignments.map((assignment) => <tr key={`${assignment.examId}-${assignment.userId}`}><td>{examName.get(assignment.examId) ?? assignment.examId}</td><td>{teacherName.get(assignment.userId) ?? assignment.userId}</td><td><strong>{assignment.score.toFixed(1)}/100</strong></td><td className="muted">Disponibilité {assignment.scoreDetails.availabilityPoints.toFixed(1)} · quota {assignment.scoreDetails.quotaPoints.toFixed(1)} · équité {assignment.scoreDetails.fairnessPoints.toFixed(1)} · ancienneté {assignment.scoreDetails.recencyPoints.toFixed(1)} · préférence {assignment.scoreDetails.preferencePoints.toFixed(1)}{assignment.scoreDetails.assignmentWeight > 1 ? ` · tiers-temps ×${assignment.scoreDetails.assignmentWeight}` : ""}</td></tr>)}</tbody></table></div>
      <form action={validateSimulationAction}><input type="hidden" name="simulationId" value={simulation.id} /><input type="hidden" name="academicYear" value={selectedYear} /><button>Valider cette simulation</button></form>
    </div>}

    <div className="card"><h2>Planning validé par examen</h2><div className="table-wrap"><table><thead><tr><th>Date</th><th>Examen</th><th>Lieu</th><th>Affectations</th><th>Couverture</th><th>Ajout manuel</th></tr></thead><tbody>{exams.map((exam) => <tr key={exam.id}><td>{formatDate(exam.date)}<br /><span className="muted">{halfDayLabel(exam.halfDay)}</span></td><td>{exam.title}<br /><span className="muted">{exam.promotion}</span></td><td>{exam.location}</td><td>{exam.assignments.length ? exam.assignments.map((assignment: AssignmentView) => <div key={assignment.id} style={{ marginBottom: 7 }}><strong>{assignment.user.name}</strong> {!assignment.locked && assignment.score < 999 && <span className="muted"> · {assignment.score.toFixed(1)}/100</span>} {assignment.locked && <StatusBadge label="Verrouillée" tone="blue" />} <form action={toggleAssignmentLock} className="inline-form"><input type="hidden" name="id" value={assignment.id} /><button className="small secondary" disabled={assignment.convocation?.status === "SENT"}>{assignment.convocation?.status === "SENT" ? "Notifiée" : assignment.locked ? "Déverrouiller" : "Verrouiller"}</button></form> <form action={removeAssignment} className="inline-form"><input type="hidden" name="id" value={assignment.id} /><button className="small danger" disabled={assignment.convocation?.status === "SENT"}>Retirer</button></form></div>) : "—"}</td><td>{exam.assignments.length >= exam.requiredSupervisors ? <StatusBadge label={`${exam.assignments.length}/${exam.requiredSupervisors}`} tone="green" /> : <StatusBadge label={`${exam.assignments.length}/${exam.requiredSupervisors}`} tone="red" />}</td><td><form action={addManualAssignment} className="inline-form"><input type="hidden" name="examId" value={exam.id} /><select name="userId" required defaultValue=""><option value="" disabled>Choisir…</option>{teachers.filter((teacher) => !exam.assignments.some((assignment) => assignment.userId === teacher.id)).map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} ({teacher.assignments.length})</option>)}</select><button className="small">Ajouter</button></form></td></tr>)}{exams.length === 0 && <tr><td colSpan={6} className="empty">Aucun examen publié pour cette année.</td></tr>}</tbody></table></div></div>

    <div className="card"><h2>Tableau d’équité</h2><div className="table-wrap"><table className="compact"><thead><tr><th>Enseignant</th><th>Service</th><th>Affectations</th><th>Quota</th><th>Écart au quota</th></tr></thead><tbody>{teachers.map((teacher) => <tr key={teacher.id}><td>{teacher.name}</td><td>{teacher.department || "—"}</td><td>{teacher.assignments.length}</td><td>{teacher.quotaAnnual ?? "Non défini"}</td><td>{teacher.quotaAnnual === null ? "—" : teacher.quotaAnnual - teacher.assignments.length}</td></tr>)}</tbody></table></div></div>
  </main>;
}
