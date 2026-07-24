import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Notice } from "@/components/Notice";
import { StatusBadge } from "@/components/StatusBadge";
import { calculateCampaignKpis, loadCampaignSnapshot } from "@/lib/campaign-dashboard";
import { campaignStatusLabels, campaignTone } from "@/lib/campaigns";
import { formatDate } from "@/lib/format";
import { requireStaff } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { refreshCampaignAlerts, resolveCampaignAlert } from "./actions";

export const dynamic = "force-dynamic";

const severityLabel = { INFO: "Information", WARNING: "Avertissement", CRITICAL: "Critique" } as const;
const severityTone = { INFO: "blue", WARNING: "amber", CRITICAL: "red" } as const;

function ProgressCard({ label, value, note }: { label: string; value: number; note: string }) {
  return <article className="card progress-card"><div className="kpi-row"><strong>{label}</strong><span>{value}%</span></div><div className="progress"><span style={{ width: `${value}%` }} /></div><p className="stat-note">{note}</p></article>;
}

export default async function CampaignDashboardPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user } = await requireStaff();
  const { id } = await params;
  const query = await searchParams;
  const snapshot = await loadCampaignSnapshot(id);
  if (!snapshot) notFound();
  if (user.role !== "ADMIN") {
    const manager = await prisma.campaign.findUnique({ where: { id }, select: { managerId: true } });
    if (manager?.managerId && manager.managerId !== user.id) redirect("/campaigns?error=access");
  }

  const kpis = calculateCampaignKpis(snapshot);
  const [campaignDetails, alerts, statusHistory] = await Promise.all([
    prisma.campaign.findUnique({ where: { id }, include: { manager: { select: { name: true } } } }),
    prisma.campaignAlert.findMany({
      where: { campaignId: id, resolvedAt: null },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: 100
    }),
    prisma.auditLog.findMany({
      where: { entity: "Campaign", entityId: id, action: { in: ["CAMPAIGN_CREATED", "CAMPAIGN_STATUS_UPDATED"] } },
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
      take: 30
    })
  ]);
  if (!campaignDetails) notFound();

  return <main className="container">
    <div className="page-header">
      <div><p className="eyebrow">Centre de pilotage</p><h1>{campaignDetails.name}</h1><p className="muted">{campaignDetails.promotion} · {campaignDetails.academicYear} · {formatDate(campaignDetails.startDate)} au {formatDate(campaignDetails.endDate)}</p></div>
      <div className="actions"><Link className="button secondary" href="/campaigns">Retour aux campagnes</Link><Link className="button secondary" href={`/campaigns/${id}/reminders`}>Suivre les relances</Link><a className="button secondary" href={`/api/export/campaigns/${id}`}>Exporter le pilotage</a><form action={refreshCampaignAlerts}><input type="hidden" name="campaignId" value={id} /><button>Actualiser les alertes</button></form></div>
    </div>
    {query.refreshed === "1" && <Notice type="success">Les indicateurs et alertes ont été recalculés.</Notice>}

    <section className="card campaign-summary">
      <div><span className="muted">Statut</span><br /><StatusBadge label={campaignStatusLabels[campaignDetails.status]} tone={campaignTone(campaignDetails.status)} /></div>
      <div><span className="muted">Gestionnaire</span><br /><strong>{campaignDetails.manager?.name || "Non attribuée"}</strong></div>
      <div><span className="muted">Date limite de réponse</span><br /><strong>{campaignDetails.responseDeadline ? formatDate(campaignDetails.responseDeadline) : "Non définie"}</strong></div>
      <div><span className="muted">Progression globale</span><br /><strong className="large-number">{kpis.progressPercent}%</strong></div>
    </section>

    <section className="grid" aria-label="Indicateurs de campagne">
      <article className="card stat col-3"><span className="stat-label">Examens</span><span className="stat-value">{kpis.exams}</span><span className="stat-note">{kpis.requiredPosts} postes nécessaires</span></article>
      <article className="card stat col-3"><span className="stat-label">Affectations</span><span className="stat-value">{kpis.assignedPosts}</span><span className="stat-note">Couverture {kpis.coveragePercent}%</span></article>
      <article className="card stat col-3"><span className="stat-label">Réponses</span><span className="stat-value">{kpis.respondingTeachers}/{kpis.totalTeachers}</span><span className="stat-note">{kpis.missingAvailability} manquante{kpis.missingAvailability > 1 ? "s" : ""}</span></article>
      <article className="card stat col-3"><span className="stat-label">Convocations envoyées</span><span className="stat-value">{kpis.sentConvocations}</span><span className="stat-note">{kpis.convocationPercent}% des affectations</span></article>
    </section>

    <section className="grid">
      <div className="col-4"><ProgressCard label="Disponibilités" value={kpis.availabilityPercent} note={`${kpis.respondingTeachers} enseignant(s) ayant répondu`} /></div>
      <div className="col-4"><ProgressCard label="Couverture" value={kpis.coveragePercent} note={`${kpis.assignedPosts} poste(s) affecté(s) sur ${kpis.requiredPosts}`} /></div>
      <div className="col-4"><ProgressCard label="Convocations" value={kpis.convocationPercent} note={`${kpis.sentConvocations} convocation(s) envoyée(s)`} /></div>
    </section>

    <section className="grid">
      <div className="col-8 card">
        <div className="section-heading"><div><h2>Alertes actives</h2><p className="muted">Les alertes sont recalculées à la demande et restent auditables après résolution.</p></div><span className="badge red">{alerts.length}</span></div>
        <div className="alert-list">
          {alerts.map((alert) => <article key={alert.id} className={`campaign-alert ${alert.severity.toLowerCase()}`}>
            <div><StatusBadge label={severityLabel[alert.severity]} tone={severityTone[alert.severity]} /><h3>{alert.title}</h3><p>{alert.message}</p><small className="muted">Détectée le {formatDate(alert.createdAt)}</small></div>
            <div className="actions">{alert.resolutionUrl && <Link className="button small secondary" href={alert.resolutionUrl}>Corriger</Link>}<form action={resolveCampaignAlert}><input type="hidden" name="campaignId" value={id} /><input type="hidden" name="alertId" value={alert.id} /><button className="small">Marquer résolue</button></form></div>
          </article>)}
          {alerts.length === 0 && <div className="empty">Aucune alerte active. Lancez une actualisation après toute modification importante.</div>}
        </div>
      </div>
      <div className="col-4 card">
        <h2>Historique de progression</h2>
        <ol className="timeline">
          {statusHistory.map((event) => <li key={event.id}><strong>{event.action === "CAMPAIGN_CREATED" ? "Campagne créée" : "Statut modifié"}</strong><span>{formatDate(event.createdAt)} · {event.actor?.name || "Système"}</span></li>)}
          {statusHistory.length === 0 && <li><span className="muted">Aucun événement historisé.</span></li>}
        </ol>
      </div>
    </section>
  </main>;
}
