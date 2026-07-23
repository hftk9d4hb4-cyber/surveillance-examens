import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { Notice } from "@/components/Notice";
import { StatusBadge } from "@/components/StatusBadge";
import { canAccessCampaign } from "@/lib/campaign-access";
import { formatDate, formatDateTime } from "@/lib/format";
import { requireStaff } from "@/lib/guards";
import { reminderKindFor } from "@/lib/reminder-policy";
import {
  filterReminderRows,
  type ActivationStatus,
  type AvailabilityProgress,
  type ReminderOverallStatus
} from "@/lib/reminders-dashboard-core";
import { loadCampaignReminders } from "@/lib/reminders-dashboard";
import { sendCampaignReminders } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const activationLabels: Record<ActivationStatus, string> = {
  NOT_INVITED: "Invitation à envoyer",
  INVITED: "Activation en attente",
  ACTIVATED: "Compte activé",
  INACTIVE: "Compte inactif"
};

const availabilityLabels: Record<AvailabilityProgress, string> = {
  NONE: "Aucune réponse",
  PARTIAL: "Réponse partielle",
  COMPLETE: "Réponse complète"
};

const statusLabels: Record<ReminderOverallStatus, string> = {
  INACTIVE: "Compte inactif",
  TO_ACTIVATE: "À activer",
  NO_RESPONSE: "À relancer",
  INCOMPLETE: "À compléter",
  COMPLETE: "Complet"
};

const statusTones = {
  INACTIVE: "red",
  TO_ACTIVATE: "amber",
  NO_RESPONSE: "red",
  INCOMPLETE: "amber",
  COMPLETE: "green"
} as const;

const reminderKindLabels: Record<string, string> = {
  ACTIVATION: "Activation",
  AVAILABILITY: "Disponibilités",
  NONE: "Non applicable"
};

const reminderResultLabels = {
  SENT: "Envoyée",
  FAILED: "Échec",
  SKIPPED: "Ignorée"
} as const;

const reminderResultTones = {
  SENT: "green",
  FAILED: "red",
  SKIPPED: "amber"
} as const;

function value(query: SearchParams, key: string) {
  const candidate = query[key];
  return Array.isArray(candidate) ? candidate[0] ?? "" : candidate ?? "";
}

function isActivationStatus(candidate: string): candidate is ActivationStatus {
  return candidate in activationLabels;
}

function isAvailabilityProgress(candidate: string): candidate is AvailabilityProgress {
  return candidate in availabilityLabels;
}

function isOverallStatus(candidate: string): candidate is ReminderOverallStatus {
  return candidate in statusLabels;
}

export default async function CampaignRemindersPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await requireStaff();
  const { id } = await params;
  const query = await searchParams;
  const dashboard = await loadCampaignReminders(id);
  if (!dashboard) notFound();
  if (!canAccessCampaign(dashboard.campaign.managerId, user)) redirect("/campaigns?error=access");

  const activation = value(query, "activation");
  const availability = value(query, "availability");
  const status = value(query, "status");
  const includeComplete = value(query, "scope") === "all";
  const rows = filterReminderRows(dashboard.rows, {
    search: value(query, "q"),
    activation: isActivationStatus(activation) ? activation : "",
    availability: isAvailabilityProgress(availability) ? availability : "",
    status: isOverallStatus(status) ? status : "",
    includeComplete
  });
  const completeCount = dashboard.rows.filter((row) => row.overallStatus === "COMPLETE").length;
  const actionCount = dashboard.rows.length - completeCount;
  const sent = Number(value(query, "sent") || 0);
  const failed = Number(value(query, "failed") || 0);
  const skipped = Number(value(query, "skipped") || 0);
  const error = value(query, "error");

  return <main className="container reminders-page">
    <div className="page-header">
      <div>
        <p className="eyebrow">Suivi des réponses</p>
        <h1>Relances · {dashboard.campaign.name}</h1>
        <p className="muted">
          {dashboard.campaign.promotion} · {dashboard.campaign.academicYear} · {formatDate(dashboard.campaign.startDate)} au {formatDate(dashboard.campaign.endDate)}
        </p>
      </div>
      <div className="actions">
        <Link className="button secondary" href={`/campaigns/${id}/dashboard`}>Retour au pilotage</Link>
      </div>
    </div>
    {(sent > 0 || failed > 0 || skipped > 0) && <Notice type={failed > 0 ? "error" : "success"}>
      Relances traitées : {sent} envoyée{sent > 1 ? "s" : ""}, {failed} échec{failed > 1 ? "s" : ""}, {skipped} ignorée{skipped > 1 ? "s" : ""}.
    </Notice>}
    {error === "selection" && <Notice type="error">Sélectionnez au moins un enseignant à relancer.</Notice>}
    {error === "limit" && <Notice type="error">Une sélection est limitée à 50 enseignants.</Notice>}

    <section className="reminders-summary" aria-label="Synthèse des réponses">
      <article><strong>{dashboard.rows.length}</strong><span>enseignants</span></article>
      <article><strong>{actionCount}</strong><span>actions requises</span></article>
      <article><strong>{completeCount}</strong><span>dossiers complets</span></article>
    </section>

    <form method="get" className="card reminders-filters">
      <div className="field reminders-search">
        <label htmlFor="reminders-search">Enseignant ou courriel</label>
        <input id="reminders-search" type="search" name="q" defaultValue={value(query, "q")} placeholder="Rechercher…" />
      </div>
      <div className="field">
        <label htmlFor="activation-filter">Activation</label>
        <select id="activation-filter" name="activation" defaultValue={activation}>
          <option value="">Tous les états</option>
          {Object.entries(activationLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="availability-filter">Disponibilités</label>
        <select id="availability-filter" name="availability" defaultValue={availability}>
          <option value="">Tous les états</option>
          {Object.entries(availabilityLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="status-filter">Statut global</label>
        <select id="status-filter" name="status" defaultValue={status}>
          <option value="">Tous les statuts</option>
          {Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>
      <label className="reminders-scope">
        <input type="checkbox" name="scope" value="all" defaultChecked={includeComplete} />
        Afficher les dossiers complets
      </label>
      <div className="actions">
        <button type="submit">Appliquer</button>
        <Link className="button secondary" href={`/campaigns/${id}/reminders`}>Réinitialiser</Link>
      </div>
    </form>

    <form action={sendCampaignReminders} className="card reminders-results">
      <input type="hidden" name="campaignId" value={id} />
      <div className="section-heading">
        <div><h2>Enseignants à suivre</h2><p className="muted">{rows.length} résultat{rows.length > 1 ? "s" : ""} après filtrage</p></div>
        <ConfirmSubmitButton
          confirmation="Envoyer une relance à tous les enseignants sélectionnés ?"
          type="submit"
        >
          Relancer la sélection
        </ConfirmSubmitButton>
      </div>
      <div className="table-wrap">
        <table className="reminders-table">
          <thead><tr>
            <th><span className="sr-only">Sélection</span></th>
            <th>Enseignant</th>
            <th>Activation</th>
            <th>Disponibilités</th>
            <th>Dernière connexion</th>
            <th>Relances</th>
            <th>Statut global</th>
            <th>Action requise</th>
          </tr></thead>
          <tbody>
            {rows.map((row) => {
              const reminderKind = reminderKindFor(row, dashboard.campaign.status);
              return <tr key={row.id}>
              <td data-label="Sélection">{reminderKind ? <input type="checkbox" name="userId" value={row.id} aria-label={`Sélectionner ${row.name}`} /> : "—"}</td>
              <td data-label="Enseignant"><strong>{row.name}</strong><br /><span className="muted">{row.email}</span></td>
              <td data-label="Activation">{activationLabels[row.activationStatus]}</td>
              <td data-label="Disponibilités">{availabilityLabels[row.availabilityProgress]}<br /><span className="muted">{row.answeredSlots}/{row.expectedSlots} créneaux</span></td>
              <td data-label="Dernière connexion">{formatDateTime(row.lastLoginAt)}</td>
              <td data-label="Relances"><strong>{row.reminderCount}</strong><br /><span className="muted">{row.lastReminderAt ? formatDateTime(row.lastReminderAt) : "Aucune relance"}</span></td>
              <td data-label="Statut global"><StatusBadge label={statusLabels[row.overallStatus]} tone={statusTones[row.overallStatus]} /></td>
              <td data-label="Action requise">{row.requiredAction}{reminderKind && <><br /><ConfirmSubmitButton
                className="small secondary"
                confirmation={`Envoyer une relance à ${row.name} ?`}
                name="singleUserId"
                value={row.id}
                type="submit"
              >Relancer</ConfirmSubmitButton></>}</td>
            </tr>;
            })}
            {rows.length === 0 && <tr><td colSpan={8} className="empty">Aucun enseignant ne correspond aux filtres sélectionnés.</td></tr>}
          </tbody>
        </table>
      </div>
    </form>

    <section className="card reminders-history">
      <div className="section-heading">
        <div><h2>Historique des relances</h2><p className="muted">Les 100 dernières tentatives de cette campagne, avec leur résultat.</p></div>
      </div>
      <div className="table-wrap">
        <table className="reminders-table compact">
          <thead><tr><th>Date</th><th>Enseignant</th><th>Type</th><th>Résultat</th><th>Envoyée par</th></tr></thead>
          <tbody>
            {dashboard.history.map((event) => <tr key={event.id}>
              <td data-label="Date">{formatDateTime(event.createdAt)}</td>
              <td data-label="Enseignant">{event.teacherName}</td>
              <td data-label="Type">{reminderKindLabels[event.kind] ?? event.kind}</td>
              <td data-label="Résultat"><StatusBadge label={reminderResultLabels[event.result]} tone={reminderResultTones[event.result]} /></td>
              <td data-label="Envoyée par">{event.actorName}</td>
            </tr>)}
            {dashboard.history.length === 0 && <tr><td colSpan={5} className="empty">Aucune relance enregistrée pour cette campagne.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  </main>;
}
