import Link from "next/link";
import type { buildPreparationReport } from "@/lib/preparation-core";
import { StatusBadge } from "./StatusBadge";

export function PreparationReport({ report, campaignId, year }: { report: ReturnType<typeof buildPreparationReport>; campaignId?: string; year: string }) {
  const relances = campaignId ? `/campaigns/${campaignId}/reminders` : "/campaigns";
  return <>
    <section className="card"><h2>Bilan de préparation</h2><StatusBadge label={report.ready ? "Aucun point bloquant détecté" : `${report.blockers.length} point(s) bloquant(s)`} tone={report.ready ? "green" : "red"} />
      <p>{report.examCount} examen(s) publié(s) · {report.warnings.length} avertissement(s). Bilan recalculé à l’ouverture et avant publication ou envoi.</p>
      <div className="table-wrap"><table><thead><tr><th>À traiter</th><th>Nombre</th><th>Action</th></tr></thead><tbody>
        <tr><td>Postes à pourvoir</td><td>{report.missingPosts}</td><td><Link href={`/assignments?year=${encodeURIComponent(year)}`}>Compléter les affectations</Link></td></tr>
        <tr><td>Enseignants avec disponibilités incomplètes</td><td>{report.missingAvailability}</td><td><Link href={relances}>Suivre les relances</Link></td></tr>
        <tr><td>Convocations à envoyer</td><td>{report.pendingConvocations}</td><td><Link href={`/convocations?year=${encodeURIComponent(year)}`}>Ouvrir les convocations</Link></td></tr>
        <tr><td>Échecs d’envoi de convocation</td><td>{report.failedConvocations}</td><td><Link href={`/convocations?year=${encodeURIComponent(year)}`}>Examiner les erreurs</Link></td></tr>
        <tr><td>Confirmations attendues après envoi</td><td>{report.pendingAcknowledgements}</td><td><Link href={`/convocations?year=${encodeURIComponent(year)}`}>Suivre les confirmations</Link></td></tr>
      </tbody></table></div>
      <p className="muted">Les disponibilités sont mesurées sur les demi-journées des examens de ce périmètre, pour tous les enseignants actifs de la faculté.</p>
    </section>
    <section className="card"><h2>Points à vérifier</h2>{report.issues.length ? <ul>{report.issues.map((issue, i) => <li key={`${issue.code}-${issue.examId}-${issue.userId}-${i}`}><strong>{issue.severity === "BLOCKER" ? "Bloquant" : "Avertissement"}</strong> — {issue.message}</li>)}</ul> : <p>Aucune anomalie détectée sur les contrôles disponibles.</p>}<p className="muted">Les conflits, indisponibilités, comptes non éligibles et postes vacants bloquent la publication et l’envoi. Les quotas dépassés et réponses absentes restent des avertissements à examiner.</p></section>
  </>;
}
