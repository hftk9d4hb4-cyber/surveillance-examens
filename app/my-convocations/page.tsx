import { redirect } from "next/navigation";
import { Notice } from "@/components/Notice";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatDateTime, halfDayLabel } from "@/lib/format";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { todayInTimeZone } from "@/lib/time";
import { acknowledgeAssignment } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function MyConvocationsPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await requireUser();
  if (user.role !== "TEACHER") redirect("/convocations");
  const params = await searchParams;
  const assignments = await prisma.assignment.findMany({
    where: {
      userId: user.id,
      exam: { date: { gte: todayInTimeZone() }, status: "PUBLISHED" }
    },
    include: { exam: true, convocation: true, acknowledgement: true },
    orderBy: [{ exam: { date: "asc" } }, { exam: { startTime: "asc" } }]
  });
  const sent = assignments.filter((assignment) => assignment.convocation?.status === "SENT");
  const pending = sent.filter((assignment) => !assignment.acknowledgement).length;

  return <main className="container teacher-convocations">
    <div className="page-header">
      <div>
        <p className="eyebrow">Espace enseignant</p>
        <h1>Mes convocations</h1>
        <p className="muted">Consultez chaque convocation et confirmez que vous en avez pris connaissance.</p>
      </div>
      <StatusBadge label={`${pending} à confirmer`} tone={pending ? "amber" : "green"} />
    </div>

    {params.acknowledged === "1" && <Notice type="success">Votre prise de connaissance a bien été enregistrée.</Notice>}
    {params.already === "1" && <Notice type="success">Cette convocation avait déjà été confirmée.</Notice>}
    {params.error && <Notice type="error">Cette convocation ne peut pas être confirmée. Rechargez la page ou contactez la scolarité.</Notice>}

    <section className="teacher-convocation-list" aria-label="Convocations à venir">
      {assignments.map((assignment) => <article className="card teacher-convocation-card" key={assignment.id}>
        <div className="teacher-convocation-heading">
          <div>
            <p className="eyebrow">{formatDate(assignment.exam.date)} · {halfDayLabel(assignment.exam.halfDay)}</p>
            <h2>{assignment.exam.title}</h2>
            <p className="muted">{assignment.exam.promotion}</p>
          </div>
          {assignment.acknowledgement
            ? <StatusBadge label="Prise de connaissance confirmée" tone="green" />
            : assignment.convocation?.status === "SENT"
              ? <StatusBadge label="Confirmation attendue" tone="amber" />
              : <StatusBadge label="Convocation non envoyée" tone="blue" />}
        </div>
        <dl className="teacher-convocation-details">
          <div><dt>Horaire</dt><dd>{assignment.exam.startTime}–{assignment.exam.endTime}</dd></div>
          <div><dt>Lieu</dt><dd>{assignment.exam.location}</dd></div>
          <div><dt>Envoi</dt><dd>{formatDateTime(assignment.convocation?.sentAt)}</dd></div>
          {assignment.acknowledgement && <div><dt>Confirmation</dt><dd>{formatDateTime(assignment.acknowledgement.acknowledgedAt)}</dd></div>}
        </dl>
        <div className="actions">
          <a className="button secondary" href={`/api/convocations/ics/${assignment.id}`}>Ajouter au calendrier</a>
          {assignment.convocation?.status === "SENT" && !assignment.acknowledgement && <form action={acknowledgeAssignment}>
            <input type="hidden" name="assignmentId" value={assignment.id} />
            <button>J’ai pris connaissance de cette convocation</button>
          </form>}
        </div>
      </article>)}
      {assignments.length === 0 && <div className="card empty">Aucune convocation à venir.</div>}
    </section>
  </main>;
}
