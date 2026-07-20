import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { formatDateTime } from "@/lib/format";
import { Notice } from "@/components/Notice";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function ImportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const [logs, pendingActivations] = await Promise.all([
    prisma.importLog.findMany({ include: { createdBy: true }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.user.count({ where: { role: "TEACHER", isActive: true, mustChangePassword: true } })
  ]);
  return (
    <main className="container">
      <div className="page-header"><div><h1>Imports et activation des comptes</h1><p className="muted">Utilisez les modèles fournis. Les imports mettent à jour les lignes existantes à partir de l'adresse électronique ou de l'identifiant d'examen.</p></div></div>
      {params.teachersCreated !== undefined && <Notice type={Number(params.teachersErrors || 0) ? "warning" : "success"}>Enseignants : {params.teachersCreated} créé(s), {params.teachersUpdated} mis à jour, {params.teachersErrors} erreur(s).</Notice>}
      {params.examsCreated !== undefined && <Notice type={Number(params.examsErrors || 0) ? "warning" : "success"}>Examens : {params.examsCreated} créé(s), {params.examsUpdated} mis à jour, {params.examsErrors} erreur(s).</Notice>}
      {(params.teacherError || params.examError) && <Notice type="error">L'import a échoué. Vérifiez le format du fichier et consultez l'historique ci-dessous.</Notice>}
      {params.activationSent !== undefined && <Notice type={Number(params.activationFailed || 0) ? "warning" : "success"}>Activations : {params.activationSent} envoyée(s), {params.activationFailed} erreur(s).</Notice>}
      <div className="grid">
        <div className="col-6"><div className="card"><h2>1. Liste des enseignants</h2><p>Téléchargez le modèle, complétez-le puis importez-le au format XLSX ou CSV.</p><div className="actions" style={{ marginBottom: 16 }}><a className="button secondary" href="/modeles/modele_enseignants.xlsx">Télécharger le modèle</a></div><form action="/api/import/teachers" method="post" encType="multipart/form-data"><div className="field full"><label>Fichier enseignants</label><input type="file" name="file" accept=".xlsx,.csv" required /></div><button>Importer les enseignants</button></form></div></div>
        <div className="col-6"><div className="card"><h2>2. Calendrier des examens</h2><p>Une ligne correspond à un examen et précise le nombre de surveillants requis.</p><div className="actions" style={{ marginBottom: 16 }}><a className="button secondary" href="/modeles/modele_examens.xlsx">Télécharger le modèle</a></div><form action="/api/import/exams" method="post" encType="multipart/form-data"><div className="field full"><label>Fichier examens</label><input type="file" name="file" accept=".xlsx,.csv" required /></div><button>Importer les examens</button></form></div></div>
      </div>
      <div className="card"><div className="page-header"><div><h2>3. Activation des comptes enseignants</h2><p className="muted">Les messages sont envoyés par lots de 20 pour respecter les limites de Gmail et de Vercel.</p></div><StatusBadge label={`${pendingActivations} en attente`} tone={pendingActivations ? "amber" : "green"} /></div>{pendingActivations > 0 ? <form action="/api/users/send-activations" method="post"><button>Envoyer les 20 prochains liens</button></form> : <p>Tous les comptes actifs disposent d'un mot de passe.</p>}</div>
      <div className="card"><h2>Historique des imports</h2><div className="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Fichier</th><th>Résultat</th><th>Créées</th><th>Mises à jour</th><th>Erreurs</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td>{formatDateTime(log.createdAt)}</td><td>{log.kind === "TEACHERS" ? "Enseignants" : "Examens"}</td><td>{log.fileName}</td><td>{log.status === "SUCCESS" ? <StatusBadge label="Réussi" tone="green" /> : log.status === "PARTIAL" ? <StatusBadge label="Partiel" tone="amber" /> : <StatusBadge label="Échec" tone="red" />}</td><td>{log.createdRows}</td><td>{log.updatedRows}</td><td>{log.errorRows}</td></tr>)}{logs.length === 0 && <tr><td colSpan={7} className="empty">Aucun import réalisé.</td></tr>}</tbody></table></div></div>
    </main>
  );
}
