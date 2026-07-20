import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { dateKey, formatDate, halfDayLabel } from "@/lib/format";
import { createExam, deleteExam, setExamStatus } from "./actions";
import { Notice } from "@/components/Notice";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function ExamsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff();
  const params = await searchParams;
  const exams = await prisma.exam.findMany({ include: { assignments: true }, orderBy: [{ date: "asc" }, { halfDay: "asc" }, { title: "asc" }], take: 500 });
  return (
    <main className="container">
      <div className="page-header"><div><h1>Examens</h1><p className="muted">Le calendrier peut être importé en une fois ou complété manuellement.</p></div><a className="button" href="/admin/imports">Importer un calendrier</a></div>
      {params.created === "1" && <Notice type="success">L'examen a été créé.</Notice>}
      {params.error === "validation" && <Notice type="error">Certaines informations sont invalides ou incomplètes.</Notice>}
      <div className="card"><h2>Ajouter un examen</h2><form action={createExam} className="form-grid"><div className="field full"><label>Intitulé</label><input name="title" required /></div><div className="field third"><label>Date</label><input name="date" type="date" required /></div><div className="field third"><label>Demi-journée</label><select name="halfDay" defaultValue="AM"><option value="AM">Matin</option><option value="PM">Après-midi</option></select></div><div className="field third"><label>Surveillants requis</label><input name="requiredSupervisors" type="number" min="1" defaultValue="2" required /></div><div className="field third"><label>Heure de début</label><input name="startTime" type="time" defaultValue="08:30" required /></div><div className="field third"><label>Heure de fin</label><input name="endTime" type="time" defaultValue="12:30" required /></div><div className="field third"><label>Promotion</label><input name="promotion" placeholder="DFASM1" required /></div><div className="field"><label>Lieu / salle</label><input name="location" required /></div><div className="field"><label>Notes</label><input name="notes" /></div><div className="field full"><button>Créer l'examen</button></div></form></div>
      <div className="card"><h2>Calendrier enregistré</h2><div className="table-wrap"><table><thead><tr><th>Date</th><th>Examen</th><th>Promotion</th><th>Lieu</th><th>Besoin</th><th>Statut</th><th>Actions</th></tr></thead><tbody>{exams.map((exam) => <tr key={exam.id}><td>{formatDate(exam.date)}<br /><span className="muted">{halfDayLabel(exam.halfDay)} · {exam.startTime}–{exam.endTime}</span></td><td>{exam.title}<br /><span className="muted">{exam.academicYear}</span></td><td>{exam.promotion}</td><td>{exam.location}</td><td>{exam.assignments.length}/{exam.requiredSupervisors}</td><td>{exam.status === "PUBLISHED" ? <StatusBadge label="Publié" tone="green" /> : exam.status === "DRAFT" ? <StatusBadge label="Brouillon" tone="amber" /> : <StatusBadge label="Annulé" tone="red" />}</td><td><div className="actions"><form action={setExamStatus} className="inline-form"><input type="hidden" name="id" value={exam.id} /><select name="status" defaultValue={exam.status} aria-label={`Statut ${exam.title}`}><option value="PUBLISHED">Publié</option><option value="DRAFT">Brouillon</option><option value="CANCELLED">Annulé</option></select><button className="small secondary">Mettre à jour</button></form><form action={deleteExam}><input type="hidden" name="id" value={exam.id} /><button className="small danger">Supprimer</button></form></div></td></tr>)}{exams.length === 0 && <tr><td colSpan={7} className="empty">Aucun examen enregistré.</td></tr>}</tbody></table></div></div>
    </main>
  );
}
