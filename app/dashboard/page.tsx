import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, hasStaffRole } from "@/lib/guards";
import { formatDate, halfDayLabel } from "@/lib/format";
import { todayInTimeZone } from "@/lib/time";
import { StatCard } from "@/components/StatCard";
import { Notice } from "@/components/Notice";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";


export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireUser();
  const params = await searchParams;
  const today = todayInTimeZone();

  if (user.role === "TEACHER") {
    const [myAssignments, futureSlots, myAvailabilities] = await Promise.all([
      prisma.assignment.findMany({
        where: { userId: user.id, exam: { date: { gte: today }, status: "PUBLISHED" } },
        include: { exam: true, convocation: true, acknowledgement: true },
        orderBy: { exam: { date: "asc" } },
        take: 20
      }),
      prisma.exam.findMany({
        where: { date: { gte: today }, status: "PUBLISHED" },
        select: { date: true, halfDay: true }
      }),
      prisma.availability.count({ where: { userId: user.id, date: { gte: today } } })
    ]);

    const slotCount = new Set(
      futureSlots.map((item) => `${item.date.toISOString().slice(0, 10)}|${item.halfDay}`)
    ).size;
    const completion = slotCount ? Math.round((myAvailabilities / slotCount) * 100) : 100;

    return (
      <main className="container">
        <div className="page-header">
          <div>
            <h1>Mon tableau de bord</h1>
            <p className="muted">Bonjour {user.name}. Consultez vos disponibilités et vos convocations.</p>
          </div>
        </div>
        {params.error === "access" && <Notice type="error">Vous n’avez pas accès à cette rubrique.</Notice>}
        <div className="grid">
          <div className="col-4"><StatCard value={myAssignments.length} label="surveillances à venir" /></div>
          <div className="col-4"><StatCard value={`${completion}%`} label="disponibilités renseignées" note={`${myAvailabilities}/${slotCount} demi-journées`} /></div>
          <div className="col-4"><StatCard value={myAssignments.filter((item) => item.convocation?.status === "SENT" && !item.acknowledgement).length} label="convocations à confirmer" /></div>
        </div>
        <div className="card">
          <div className="page-header">
            <div><h2>Mes prochaines surveillances</h2></div>
            <div className="actions"><Link className="button secondary" href="/availability">Renseigner mes disponibilités</Link><Link className="button" href="/my-convocations">Mes convocations</Link></div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Session</th><th>Examen</th><th>Lieu</th><th>Horaire</th><th>Convocation</th></tr></thead>
              <tbody>
                {myAssignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>{formatDate(assignment.exam.date)}</td>
                    <td>{halfDayLabel(assignment.exam.halfDay)}</td>
                    <td>{assignment.exam.title}<br /><span className="muted">{assignment.exam.promotion}</span></td>
                    <td>{assignment.exam.location}</td>
                    <td>{assignment.exam.startTime}–{assignment.exam.endTime}</td>
                    <td>
                      {assignment.convocation?.status === "SENT"
                        ? assignment.acknowledgement
                          ? <StatusBadge label="Confirmée" tone="green" />
                          : <StatusBadge label="À confirmer" tone="amber" />
                        : assignment.convocation?.status === "ERROR"
                          ? <StatusBadge label="Erreur" tone="red" />
                          : <StatusBadge label="À venir" tone="amber" />}
                    </td>
                  </tr>
                ))}
                {myAssignments.length === 0 && <tr><td colSpan={6} className="empty">Aucune surveillance affectée pour le moment.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    );
  }

  if (!hasStaffRole(user.role)) return null;
  const isAdmin = user.role === "ADMIN";
  const [teachers, exams, assignments, sent, pendingActivations, upcomingExams] = await Promise.all([
    prisma.user.count({ where: { role: "TEACHER", isActive: true } }),
    prisma.exam.count({ where: { status: "PUBLISHED", date: { gte: today } } }),
    prisma.assignment.count({ where: { exam: { status: "PUBLISHED", date: { gte: today } } } }),
    prisma.convocation.count({ where: { status: "SENT", exam: { date: { gte: today } } } }),
    isAdmin
      ? prisma.user.count({ where: { role: "TEACHER", isActive: true, mustChangePassword: true } })
      : Promise.resolve(0),
    prisma.exam.findMany({
      where: { status: "PUBLISHED", date: { gte: today } },
      include: { assignments: true },
      orderBy: [{ date: "asc" }, { halfDay: "asc" }],
      take: 12
    })
  ]);

  const required = upcomingExams.reduce((sum, exam) => sum + exam.requiredSupervisors, 0);
  const covered = upcomingExams.reduce(
    (sum, exam) => sum + Math.min(exam.assignments.length, exam.requiredSupervisors),
    0
  );
  const coverage = required ? Math.round((covered / required) * 100) : 100;

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1>Tableau de bord</h1>
          <p className="muted">Pilotage opérationnel des surveillances d’examens.</p>
        </div>
        <div className="actions">
          <Link className="button" href="/admin/imports">Importer les données</Link>
          <Link className="button secondary" href="/assignments">Gérer les affectations</Link>
        </div>
      </div>
      {params.error === "access" && <Notice type="error">Vous n’avez pas accès à cette rubrique.</Notice>}
      <div className="grid">
        <div className="col-3"><StatCard value={teachers} label="enseignants actifs" /></div>
        <div className="col-3"><StatCard value={exams} label="examens à venir" /></div>
        <div className="col-3"><StatCard value={assignments} label="affectations à venir" /></div>
        <div className="col-3"><StatCard value={`${coverage}%`} label="couverture des 12 prochains examens" /></div>
      </div>
      <div className="grid">
        <div className="col-8">
          <div className="card">
            <h2>Prochains examens</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Examen</th><th>Lieu</th><th>Couverture</th></tr></thead>
                <tbody>
                  {upcomingExams.map((exam) => (
                    <tr key={exam.id}>
                      <td>{formatDate(exam.date)} · {halfDayLabel(exam.halfDay)}</td>
                      <td>{exam.title}<br /><span className="muted">{exam.promotion}</span></td>
                      <td>{exam.location}</td>
                      <td><StatusBadge label={`${exam.assignments.length}/${exam.requiredSupervisors}`} tone={exam.assignments.length >= exam.requiredSupervisors ? "green" : "red"} /></td>
                    </tr>
                  ))}
                  {upcomingExams.length === 0 && <tr><td colSpan={4} className="empty">Aucun examen importé.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="col-4">
          <div className="card">
            <h2>À traiter</h2>
            {isAdmin && <p><strong>{pendingActivations}</strong> compte(s) enseignant en attente d’activation.</p>}
            <p><strong>{Math.max(0, assignments - sent)}</strong> convocation(s) potentiellement à envoyer.</p>
            <div className="actions">
              {isAdmin && <Link className="button secondary" href="/admin/imports">Activations</Link>}
              <Link className="button secondary" href="/convocations">Convocations</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
