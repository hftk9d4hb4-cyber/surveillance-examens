import Link from "next/link";
import { Notice } from "@/components/Notice";
import { StatusBadge } from "@/components/StatusBadge";
import { campaignStatusLabels, campaignTone } from "@/lib/campaigns";
import { academicYearForDate, formatDate } from "@/lib/format";
import { requireStaff } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { todayInTimeZone } from "@/lib/time";
import { createCampaign, deleteCampaign, updateCampaign, updateCampaignStatus } from "./actions";

export const dynamic = "force-dynamic";

export default async function CampaignsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaff();
  const params = await searchParams;
  const [campaigns, managers] = await Promise.all([
    prisma.campaign.findMany({
      include: {
        manager: { select: { id: true, name: true } },
        exams: { select: { id: true, requiredSupervisors: true } }
      },
      orderBy: [{ academicYear: "desc" }, { startDate: "asc" }, { name: "asc" }],
      take: 250
    }),
    prisma.user.findMany({
      where: { role: { in: ["MANAGER", "ADMIN"] }, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    })
  ]);

  const errorMessages: Record<string, string> = {
    validation: "Les informations sont incomplètes ou incohérentes. La date limite de réponse doit précéder le début des examens.",
    duplicate: "Une campagne de même nom existe déjà pour cette promotion et cette année universitaire.",
    manager: "La gestionnaire sélectionnée n’est pas valide.",
    "not-found": "La campagne demandée n’existe plus.",
    closed: "Une campagne clôturée doit être réouverte avant d’être modifiée.",
    "exam-period": "La nouvelle période exclurait au moins un examen déjà rattaché.",
    transition: "Cette transition de statut n’est pas autorisée.",
    empty: "Ajoutez au moins un examen avant de démarrer cette étape.",
    "has-exams": "La campagne contient des examens. Détachez-les avant de la supprimer.",
    "delete-status": "Seules les campagnes en préparation ou clôturées peuvent être supprimées.",
    access: "Vous n’êtes pas autorisé à piloter cette campagne."
  };
  const error = typeof params.error === "string" ? errorMessages[params.error] : null;
  const defaultYear = academicYearForDate(todayInTimeZone());

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1>Campagnes d’examens</h1>
          <p className="muted">Regroupez les examens d’une promotion, définissez la période et désignez la gestionnaire référente.</p>
        </div>
        <Link className="button secondary" href="/exams">Gérer les examens</Link>
      </div>

      {params.created === "1" && <Notice type="success">La campagne a été créée.</Notice>}
      {params.deleted === "1" && <Notice type="success">La campagne a été supprimée.</Notice>}
      {typeof params.updated === "string" && <Notice type="success">La campagne a été mise à jour.</Notice>}
      {error && <Notice type="error">{error}</Notice>}

      <section className="card">
        <h2>Créer une campagne</h2>
        <form action={createCampaign} className="form-grid">
          <div className="field"><label htmlFor="campaign-name">Nom</label><input id="campaign-name" name="name" placeholder="Session de janvier" maxLength={120} required /></div>
          <div className="field third"><label htmlFor="campaign-year">Année universitaire</label><input id="campaign-year" name="academicYear" defaultValue={defaultYear} pattern="[0-9]{4}-[0-9]{4}" required /></div>
          <div className="field third"><label htmlFor="campaign-promotion">Promotion</label><input id="campaign-promotion" name="promotion" placeholder="DFASM1" maxLength={120} required /></div>
          <div className="field third"><label htmlFor="campaign-manager">Gestionnaire référente</label><select id="campaign-manager" name="managerId" defaultValue=""><option value="">Non attribuée</option>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}</select></div>
          <div className="field third"><label htmlFor="campaign-start">Début des examens</label><input id="campaign-start" name="startDate" type="date" required /></div>
          <div className="field third"><label htmlFor="campaign-end">Fin des examens</label><input id="campaign-end" name="endDate" type="date" required /></div>
          <div className="field third"><label htmlFor="campaign-deadline">Date limite de réponse</label><input id="campaign-deadline" name="responseDeadline" type="date" /></div>
          <div className="field full"><button>Créer la campagne</button></div>
        </form>
      </section>

      <section className="card">
        <h2>Campagnes enregistrées</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Campagne</th><th>Période</th><th>Gestionnaire</th><th>Examens</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td><strong>{campaign.name}</strong><br /><span className="muted">{campaign.promotion} · {campaign.academicYear}</span><br /><Link href={`/campaigns/${campaign.id}/dashboard`}>Ouvrir le pilotage</Link></td>
                  <td>{formatDate(campaign.startDate)} – {formatDate(campaign.endDate)}{campaign.responseDeadline && <><br /><span className="muted">Réponse avant le {formatDate(campaign.responseDeadline)}</span></>}</td>
                  <td>{campaign.manager?.name || <span className="muted">Non attribuée</span>}</td>
                  <td>{campaign.exams.length}<br /><span className="muted">{campaign.exams.reduce((sum: number, exam: { requiredSupervisors: number }) => sum + exam.requiredSupervisors, 0)} postes</span></td>
                  <td><StatusBadge label={campaignStatusLabels[campaign.status as keyof typeof campaignStatusLabels]} tone={campaignTone(campaign.status as keyof typeof campaignStatusLabels)} /></td>
                  <td>
                    <details>
                      <summary className="button small secondary">Modifier</summary>
                      <form action={updateCampaign} className="form-grid compact-form">
                        <input type="hidden" name="id" value={campaign.id} />
                        <div className="field full"><label>Nom</label><input name="name" defaultValue={campaign.name} maxLength={120} required /></div>
                        <div className="field"><label>Année universitaire</label><input name="academicYear" defaultValue={campaign.academicYear} pattern="[0-9]{4}-[0-9]{4}" required /></div>
                        <div className="field"><label>Promotion</label><input name="promotion" defaultValue={campaign.promotion} maxLength={120} required /></div>
                        <div className="field full"><label>Gestionnaire</label><select name="managerId" defaultValue={campaign.managerId || ""}><option value="">Non attribuée</option>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}</select></div>
                        <div className="field"><label>Début</label><input name="startDate" type="date" defaultValue={campaign.startDate.toISOString().slice(0, 10)} required /></div>
                        <div className="field"><label>Fin</label><input name="endDate" type="date" defaultValue={campaign.endDate.toISOString().slice(0, 10)} required /></div>
                        <div className="field full"><label>Date limite</label><input name="responseDeadline" type="date" defaultValue={campaign.responseDeadline?.toISOString().slice(0, 10) || ""} /></div>
                        <div className="field full"><button className="small">Enregistrer</button></div>
                      </form>
                    </details>
                    <form action={updateCampaignStatus} className="inline-form">
                      <input type="hidden" name="id" value={campaign.id} />
                      <select name="status" defaultValue={campaign.status} aria-label={`Statut ${campaign.name}`}>
                        {Object.entries(campaignStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <button className="small">Changer</button>
                    </form>
                    <form action={deleteCampaign}>
                      <input type="hidden" name="id" value={campaign.id} />
                      <button className="small danger">Supprimer</button>
                    </form>
                  </td>
                </tr>
              ))}
              {campaigns.length === 0 && <tr><td colSpan={6} className="empty">Aucune campagne créée.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
