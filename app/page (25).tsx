import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { formatDate, formatDateTime, halfDayLabel } from "@/lib/format";
import { todayInTimeZone } from "@/lib/time";
import { Notice } from "@/components/Notice";
import { StatusBadge } from "@/components/StatusBadge";
import { confirmationLabel, confirmationTone } from "@/lib/convocation-confirmation";

export const dynamic = "force-dynamic";

type ConvocationAssignmentView = {
  id: string;
  user: { name: string; email: string };
  convocation: { status: string; confirmationStatus: "PENDING" | "READ" | "CONFIRMED" | "DECLINED" | "REPLACED"; sentAt: Date | null; confirmedAt: Date | null; declinedAt: Date | null; declineComment: string | null; lastError: string | null } | null;
};

export default async function ConvocationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff();
  const params = await searchParams;
  const yearsRaw = await prisma.exam.findMany({ select: { academicYear: true }, distinct: ["academicYear"], orderBy: { academicYear: "desc" } });
  const years = yearsRaw.map((item) => item.academicYear);
  const selectedYear = typeof params.year === "string" ? params.year : years[0] || "";
  const today = todayInTimeZone();
  const exams = await prisma.exam.findMany({ where: { ...(selectedYear ? { academicYear: selectedYear } : {}), status: "PUBLISHED", date: { gte: today } }, include: { assignments: { where: { user: { isActive: true, role: "TEACHER" } }, include: { user: true, convocation: true }, orderBy: { user: { name: "asc" } } } }, orderBy: [{ date: "asc" }, { halfDay: "asc" }] });
  const pending = exams.flatMap((exam) => exam.assignments).filter((assignment) => assignment.convocation?.status !== "SENT").length;
  return (
    <main className="container">
      <div className="page-header"><div><h1>Convocations</h1><p className="muted">Envois Gmail par lots de 25 avec invitation calendrier. Répétez l'opération jusqu'à ce que le compteur atteigne zéro.</p></div><StatusBadge label={`${pending} à envoyer`} tone={pending ? "amber" : "green"} /></div>
      {params.sent !== undefined && (
        <Notice type={Number(params.failed || 0) ? "warning" : "success"}>
          {params.sent} envoyée(s), {params.failed} erreur(s).
          {Number(params.remaining || 0) > 0 ? ` ${params.remaining} convocation(s) restent dans la file.` : " La file est à jour."}
        </Notice>
      )}
      {params.error === "resendExamRequired" && <Notice type="error">Pour éviter un renvoi massif accidentel, sélectionnez un examen précis avant de cocher « Renvoyer ».</Notice>}
      {params.error === "year" && <Notice type="error">Sélectionnez une année universitaire valide avant un envoi groupé.</Notice>}
      {params.error === "exam" && <Notice type="error">L’examen sélectionné est introuvable, non publié ou déjà passé.</Notice>}
      <div className="card"><h2>Envoi groupé</h2><form action="/api/convocations/send" method="post" className="form-grid"><div className="field third"><label>Année universitaire</label><select name="academicYear" defaultValue={selectedYear}>{years.map((year) => <option key={year}>{year}</option>)}</select></div><div className="field"><label>Examen</label><select name="examId"><option value="">25 prochaines convocations</option>{exams.map((exam) => <option key={exam.id} value={exam.id}>{formatDate(exam.date)} · {halfDayLabel(exam.halfDay)} · {exam.title}</option>)}</select></div><div className="field third"><label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 28 }}><input type="checkbox" name="resend" value="true" /> Renvoyer les déjà envoyées</label></div><div className="field full"><button>Envoyer les convocations</button></div></form></div>
      {exams.map((exam) => <div className="card" key={exam.id}><div className="page-header"><div><h2>{exam.title}</h2><p className="muted">{formatDate(exam.date)} · {halfDayLabel(exam.halfDay)} · {exam.startTime}–{exam.endTime} · {exam.location}</p></div><StatusBadge label={`${exam.assignments.length}/${exam.requiredSupervisors}`} tone={exam.assignments.length >= exam.requiredSupervisors ? "green" : "red"} /></div><div className="table-wrap"><table><thead><tr><th>Enseignant</th><th>Adresse</th><th>Envoi</th><th>Confirmation</th><th>Dernier envoi</th><th>Calendrier</th><th>Motif / erreur</th></tr></thead><tbody>{exam.assignments.map((assignment: ConvocationAssignmentView) => <tr key={assignment.id}><td>{assignment.user.name}</td><td>{assignment.user.email}</td><td>{assignment.convocation?.status === "SENT" ? <StatusBadge label="Envoyée" tone="green" /> : assignment.convocation?.status === "ERROR" ? <StatusBadge label="Erreur" tone="red" /> : <StatusBadge label="À envoyer" tone="amber" />}</td><td>{assignment.convocation ? <StatusBadge label={confirmationLabel(assignment.convocation.confirmationStatus)} tone={confirmationTone(assignment.convocation.confirmationStatus)} /> : "—"}</td><td>{formatDateTime(assignment.convocation?.sentAt)}</td><td><a href={`/api/convocations/ics/${assignment.id}`}>Télécharger .ics</a></td><td>{assignment.convocation?.declineComment || assignment.convocation?.lastError || ""}</td></tr>)}{exam.assignments.length === 0 && <tr><td colSpan={7} className="empty">Aucune affectation.</td></tr>}</tbody></table></div></div>)}
    </main>
  );
}
