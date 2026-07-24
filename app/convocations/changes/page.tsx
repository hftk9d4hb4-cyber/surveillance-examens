import Link from "next/link";
import { Notice } from "@/components/Notice";
import { StatusBadge } from "@/components/StatusBadge";
import { canAccessCampaign } from "@/lib/campaign-access";
import { formatDate, formatDateTime, halfDayLabel } from "@/lib/format";
import { requireStaff } from "@/lib/guards";
import {
  POST_NOTIFICATION_CHANGE_TYPES,
  postNotificationChangeLabels
} from "@/lib/post-notification-change";
import { prisma } from "@/lib/prisma";
import { applyPostNotificationChange, previewPostNotificationChange } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function value(params: SearchParams, key: string) {
  const candidate = params[key];
  return Array.isArray(candidate) ? candidate[0] ?? "" : candidate ?? "";
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export default async function PostNotificationChangesPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await requireStaff();
  const params = await searchParams;
  const selectedExamId = value(params, "examId");
  const exams = await prisma.exam.findMany({
    where: {
      status: "PUBLISHED",
      assignments: { some: { convocation: { status: "SENT" } } },
      ...(user.role === "ADMIN"
        ? {}
        : { OR: [{ campaign: { managerId: user.id } }, { campaignId: null }, { campaign: { managerId: null } }] })
    },
    include: {
      campaign: { select: { managerId: true } },
      assignments: {
        include: { user: true, convocation: true },
        orderBy: { user: { name: "asc" } }
      }
    },
    orderBy: [{ date: "desc" }, { title: "asc" }],
    take: 100
  });
  const selectedExam = exams.find((exam) => exam.id === selectedExamId) ?? exams[0] ?? null;
  if (selectedExam && !canAccessCampaign(selectedExam.campaign?.managerId ?? null, user)) return null;
  const [teachers, preview, history] = await Promise.all([
    prisma.user.findMany({
      where: { role: "TEACHER", isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    value(params, "change")
      ? prisma.postNotificationChange.findFirst({
          where: {
            id: value(params, "change"),
            status: "PREVIEW",
            ...(selectedExam ? { examId: selectedExam.id } : { id: "__none__" })
          },
          include: { exam: true, requestedBy: { select: { name: true } } }
        })
      : Promise.resolve(null),
    prisma.postNotificationChange.findMany({
      where: selectedExam ? { examId: selectedExam.id } : { id: "__none__" },
      include: { exam: true, requestedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 30
    })
  ]);
  const affectedNames = preview
    ? new Map(teachers.map((teacher) => [teacher.id, teacher.name]))
    : new Map<string, string>();

  return <main className="container">
    <div className="page-header">
      <div><p className="eyebrow">Workflow sécurisé</p><h1>Modifier après convocation</h1><p className="muted">Prévisualisez les conséquences avant toute modification d’un examen déjà notifié.</p></div>
      <Link className="button secondary" href="/convocations">Retour aux convocations</Link>
    </div>
    {params.applied === "1" && <Notice type={Number(value(params, "notificationErrors")) ? "warning" : "success"}>La modification a été appliquée. {value(params, "notificationErrors")} erreur(s) de notification.</Notice>}
    {value(params, "error") === "validation" && <Notice type="error">La demande est incomplète ou incohérente. Vérifiez le type, le motif et les champs associés.</Notice>}
    {value(params, "error") === "stale" && <Notice type="error">Les données ont changé depuis la prévisualisation. Créez une nouvelle demande.</Notice>}
    {value(params, "error") === "candidate" && <Notice type="error">Le remplaçant n’est plus éligible : affectation existante, indisponibilité, conflit journalier ou quota atteint.</Notice>}

    <section className="card">
      <h2>1. Examen concerné</h2>
      <form method="get" className="form-grid">
        <div className="field full"><label htmlFor="change-exam">Examen déjà notifié</label><select id="change-exam" name="examId" defaultValue={selectedExam?.id ?? ""}>{exams.map((exam) => <option key={exam.id} value={exam.id}>{formatDate(exam.date)} · {exam.title} · {exam.location}</option>)}</select></div>
        <div className="field full"><button>Afficher</button></div>
      </form>
    </section>

    {selectedExam && <section className="card">
      <h2>2. Demande de modification</h2>
      <p className="muted">{formatDate(selectedExam.date)} · {halfDayLabel(selectedExam.halfDay)} · {selectedExam.startTime}–{selectedExam.endTime} · {selectedExam.location}</p>
      <form action={previewPostNotificationChange} className="form-grid">
        <input type="hidden" name="examId" value={selectedExam.id} />
        <div className="field"><label>Type de modification</label><select name="type" required>{POST_NOTIFICATION_CHANGE_TYPES.map((type) => <option key={type} value={type}>{postNotificationChangeLabels[type]}</option>)}</select></div>
        <div className="field"><label>Enseignant à retirer ou remplacer</label><select name="assignmentId" defaultValue=""><option value="">Non concerné</option>{selectedExam.assignments.filter((assignment) => assignment.convocation?.status === "SENT").map((assignment) => <option key={assignment.id} value={assignment.id}>{assignment.user.name}</option>)}</select></div>
        <div className="field"><label>Nouvel enseignant</label><select name="replacementUserId" defaultValue=""><option value="">Non concerné</option>{teachers.filter((teacher) => !selectedExam.assignments.some((assignment) => assignment.userId === teacher.id)).map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></div>
        <div className="field third"><label>Nouvelle heure de début</label><input type="time" name="startTime" defaultValue={selectedExam.startTime} /></div>
        <div className="field third"><label>Nouvelle heure de fin</label><input type="time" name="endTime" defaultValue={selectedExam.endTime} /></div>
        <div className="field"><label>Nouveau lieu</label><input name="location" defaultValue={selectedExam.location} maxLength={180} /></div>
        <div className="field full"><label>Motif obligatoire</label><textarea name="reason" minLength={5} maxLength={500} required placeholder="Expliquez la raison de cette modification…" /></div>
        <div className="field full"><button>Prévisualiser les conséquences</button></div>
      </form>
    </section>}

    {preview && <section className="card post-change-preview">
      <div className="section-heading"><div><p className="eyebrow">Confirmation requise</p><h2>3. Conséquences de la modification</h2></div><StatusBadge label="Prévisualisation" tone="amber" /></div>
      <p><strong>{postNotificationChangeLabels[preview.type as keyof typeof postNotificationChangeLabels] ?? preview.type}</strong></p>
      <p><strong>Motif :</strong> {preview.reason}</p>
      <ul>{stringArray(preview.consequences).map((consequence) => <li key={consequence}>{consequence}</li>)}</ul>
      <p><strong>Personnes concernées :</strong> {stringArray(preview.affectedUserIds).map((id) => affectedNames.get(id) ?? "Enseignant inconnu").join(", ") || "Nouvel enseignant uniquement"}</p>
      <form action={applyPostNotificationChange}>
        <input type="hidden" name="changeId" value={preview.id} />
        <button className="danger">Confirmer et notifier immédiatement</button>
      </form>
    </section>}

    <section className="card">
      <h2>Historique des modifications</h2>
      <div className="table-wrap"><table><thead><tr><th>Date</th><th>Examen</th><th>Type</th><th>Motif</th><th>Statut</th><th>Demandeur</th></tr></thead><tbody>
        {history.map((change) => <tr key={change.id}><td>{formatDateTime(change.createdAt)}</td><td>{change.exam.title}</td><td>{postNotificationChangeLabels[change.type as keyof typeof postNotificationChangeLabels] ?? change.type}</td><td>{change.reason}</td><td>{change.status}{change.notificationErrors ? ` · ${change.notificationErrors} erreur(s)` : ""}</td><td>{change.requestedBy?.name ?? "Système"}</td></tr>)}
        {history.length === 0 && <tr><td colSpan={6} className="empty">Aucune modification enregistrée.</td></tr>}
      </tbody></table></div>
    </section>
  </main>;
}
