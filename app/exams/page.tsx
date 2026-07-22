import Link from "next/link";
import { Notice } from "@/components/Notice";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, halfDayLabel } from "@/lib/format";
import { requireStaff } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { createExam, deleteExam, setExamStatus, updateExamCampaign } from "./actions";

export const dynamic = "force-dynamic";

export default async function ExamsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaff();
  const params = await searchParams;
  const [exams, campaigns] = await Promise.all([
    prisma.exam.findMany({
      include: { assignments: true, campaign: { select: { id: true, name: true, promotion: true } } },
      orderBy: [{ date: "asc" }, { halfDay: "asc" }, { title: "asc" }],
      take: 500
    }),
    prisma.campaign.findMany({
      where: { status: { not: "CLOSED" } },
      select: { id: true, name: true, promotion: true, academicYear: true, startDate: true, endDate: true },
      orderBy: [{ academicYear: "desc" }, { startDate: "asc" }, { name: "asc" }]
    })
  ]);

  return (
    <main className="container">
      <div className="page-header">
        <div><h1>Examens</h1><p className="muted">Chaque examen peut être rattaché à une campagne. Les examens V1.1 existants restent valides sans campagne.</p></div>
        <div className="actions"><Link className="button secondary" href="/campaigns">Campagnes</Link><Link className="button" href="/admin/imports">Importer un calendrier</Link></div>
      </div>
      {params.created === "1" && <Notice type="success">L’examen a été créé.</Notice>}
      {params.error === "validation" && <Notice type="error">Certaines informations sont invalides ou incohérentes.</Notice>}
      {params.error === "duplicate" && <Notice type="error">Un examen identique existe déjà pour cette date, cette demi-journée et ce lieu.</Notice>}
      {params.error === "assigned" && <Notice type="error">Cet examen possède déjà des affectations. Retirez-les avant de le supprimer.</Notice>}
      {params.error === "notified" && <Notice type="error">Le statut ne peut plus être modifié car une convocation a déjà été envoyée.</Notice>}
      {params.error === "campaign" && <Notice type="error">La campagne doit être ouverte, correspondre à la promotion et inclure la date de l’examen.</Notice>}

      <section className="card">
        <h2>Ajouter un examen</h2>
        <form action={createExam} className="form-grid">
          <div className="field full"><label>Intitulé</label><input name="title" maxLength={180} required /></div>
          <div className="field third"><label>Date</label><input name="date" type="date" required /></div>
          <div className="field third"><label>Demi-journée</label><select name="halfDay" defaultValue="AM"><option value="AM">Matin</option><option value="PM">Après-midi</option></select></div>
          <div className="field third"><label>Surveillants requis</label><input name="requiredSupervisors" type="number" min="1" max="200" defaultValue="2" required /></div>
          <div className="field third"><label>Heure de début</label><input name="startTime" type="time" defaultValue="08:30" required /></div>
          <div className="field third"><label>Heure de fin</label><input name="endTime" type="time" defaultValue="12:30" required /></div>
          <div className="field third"><label>Promotion</label><input name="promotion" placeholder="DFASM1" maxLength={120} required /></div>
          <div className="field"><label>Lieu / salle</label><input name="location" maxLength={180} required /></div>
          <div className="field"><label>Campagne</label><select name="campaignId" defaultValue=""><option value="">Sans campagne</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name} · {campaign.promotion} · {campaign.academicYear}</option>)}</select></div>
          <div className="field full"><label>Notes</label><input name="notes" maxLength={2000} /></div>
          <div className="field full"><button>Créer l’examen</button></div>
        </form>
      </section>

      <section className="card">
        <h2>Calendrier enregistré</h2>
        <div className="table-wrap"><table>
          <thead><tr><th>Date</th><th>Examen</th><th>Promotion</th><th>Campagne</th><th>Lieu</th><th>Besoin</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>
            {exams.map((exam) => {
              const eligibleCampaigns = campaigns.filter((campaign) =>
                campaign.promotion === exam.promotion && exam.date >= campaign.startDate && exam.date <= campaign.endDate
              );
              return <tr key={exam.id}>
                <td>{formatDate(exam.date)}<br /><span className="muted">{halfDayLabel(exam.halfDay)} · {exam.startTime}–{exam.endTime}</span></td>
                <td>{exam.title}<br /><span className="muted">{exam.academicYear}</span></td>
                <td>{exam.promotion}</td>
                <td><form action={updateExamCampaign} className="inline-form"><input type="hidden" name="id" value={exam.id} /><select name="campaignId" defaultValue={exam.campaignId || ""} aria-label={`Campagne ${exam.title}`}><option value="">Sans campagne</option>{eligibleCampaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select><button className="small secondary">Enregistrer</button></form></td>
                <td>{exam.location}</td>
                <td>{exam.assignments.length}/{exam.requiredSupervisors}</td>
                <td>{exam.status === "PUBLISHED" ? <StatusBadge label="Publié" tone="green" /> : exam.status === "DRAFT" ? <StatusBadge label="Brouillon" tone="amber" /> : <StatusBadge label="Annulé" tone="red" />}</td>
                <td><div className="actions"><form action={setExamStatus} className="inline-form"><input type="hidden" name="id" value={exam.id} /><select name="status" defaultValue={exam.status} aria-label={`Statut ${exam.title}`}><option value="PUBLISHED">Publié</option><option value="DRAFT">Brouillon</option><option value="CANCELLED">Annulé</option></select><button className="small secondary">Mettre à jour</button></form><form action={deleteExam}><input type="hidden" name="id" value={exam.id} /><button className="small danger">Supprimer</button></form></div></td>
              </tr>;
            })}
            {exams.length === 0 && <tr><td colSpan={8} className="empty">Aucun examen enregistré.</td></tr>}
          </tbody>
        </table></div>
      </section>
    </main>
  );
}
