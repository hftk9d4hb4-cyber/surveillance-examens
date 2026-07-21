import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { formatDateTime } from "@/lib/format";
import { Notice } from "@/components/Notice";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

type ImportErrorView = { row: number; message: string };

function readImportErrors(value: unknown): ImportErrorView[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = "row" in item ? Number(item.row) : Number.NaN;
    const message = "message" in item ? String(item.message) : "";
    return Number.isFinite(row) && message ? [{ row, message }] : [];
  });
}

export default async function ImportsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireStaff();
  const isAdmin = user.role === "ADMIN";
  const params = await searchParams;
  const [logs, pendingNeverSent, pendingAll] = await Promise.all([
    prisma.importLog.findMany({
      where: isAdmin ? {} : { kind: "EXAMS" },
      include: { createdBy: true },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    isAdmin
      ? prisma.user.count({ where: { role: "TEACHER", isActive: true, mustChangePassword: true, activationSentAt: null } })
      : Promise.resolve(0),
    isAdmin
      ? prisma.user.count({ where: { role: "TEACHER", isActive: true, mustChangePassword: true } })
      : Promise.resolve(0)
  ]);

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1>Imports{isAdmin ? " et activation des comptes" : " du calendrier"}</h1>
          <p className="muted">Utilisez les modèles fournis. Les imports mettent à jour les lignes existantes à partir de l’adresse électronique ou de l’identifiant d’examen.</p>
        </div>
      </div>

      {params.teachersCreated !== undefined && (
        <Notice type={Number(params.teachersErrors || 0) ? "warning" : "success"}>
          Enseignants : {params.teachersCreated} créé(s), {params.teachersUpdated} mis à jour, {params.teachersErrors} erreur(s).
        </Notice>
      )}
      {params.examsCreated !== undefined && (
        <Notice type={Number(params.examsErrors || 0) ? "warning" : "success"}>
          Examens : {params.examsCreated} créé(s), {params.examsUpdated} mis à jour, {params.examsErrors} erreur(s).
        </Notice>
      )}
      {(params.teacherError || params.examError) && (
        <Notice type="error">L’import a échoué. Vérifiez le format du fichier et consultez l’historique ci-dessous.</Notice>
      )}
      {params.activationSent !== undefined && (
        <Notice type={Number(params.activationFailed || 0) ? "warning" : "success"}>
          Activations : {params.activationSent} envoyée(s), {params.activationFailed} erreur(s).
        </Notice>
      )}

      <div className="grid">
        {isAdmin && (
          <div className="col-6">
            <div className="card">
              <h2>1. Liste des enseignants</h2>
              <p>Téléchargez le modèle, complétez-le puis importez-le au format XLSX ou CSV.</p>
              <div className="actions" style={{ marginBottom: 16 }}>
                <a className="button secondary" href="/modeles/modele_enseignants.xlsx" download>Télécharger le modèle</a>
              </div>
              <form action="/api/import/teachers" method="post" encType="multipart/form-data">
                <div className="field full">
                  <label htmlFor="teachers-file">Fichier enseignants</label>
                  <input id="teachers-file" type="file" name="file" accept=".xlsx,.csv" required />
                </div>
                <button>Importer les enseignants</button>
              </form>
            </div>
          </div>
        )}
        <div className={isAdmin ? "col-6" : "col-12"}>
          <div className="card">
            <h2>{isAdmin ? "2." : "1."} Calendrier des examens</h2>
            <p>Une ligne correspond à un examen et précise le nombre de surveillants requis.</p>
            <div className="actions" style={{ marginBottom: 16 }}>
              <a className="button secondary" href="/modeles/modele_examens.xlsx" download>Télécharger le modèle</a>
            </div>
            <form action="/api/import/exams" method="post" encType="multipart/form-data">
              <div className="field full">
                <label htmlFor="exams-file">Fichier examens</label>
                <input id="exams-file" type="file" name="file" accept=".xlsx,.csv" required />
              </div>
              <button>Importer les examens</button>
            </form>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="card">
          <div className="page-header">
            <div>
              <h2>3. Activation des comptes enseignants</h2>
              <p className="muted">Les messages sont envoyés par lots de 20. Un lot standard ne reprend pas les comptes déjà contactés.</p>
            </div>
            <StatusBadge label={`${pendingAll} à activer`} tone={pendingAll ? "amber" : "green"} />
          </div>
          {pendingNeverSent > 0 ? (
            <form action="/api/users/send-activations" method="post">
              <button>Envoyer les {Math.min(20, pendingNeverSent)} prochains liens</button>
            </form>
          ) : pendingAll > 0 ? (
            <p>Tous les comptes en attente ont déjà reçu un lien. Les renvois individuels se font depuis la page Administration.</p>
          ) : (
            <p>Tous les comptes actifs disposent d’un mot de passe.</p>
          )}
        </div>
      )}

      <div className="card">
        <h2>Historique des imports</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Type</th><th>Fichier</th><th>Résultat</th><th>Créées</th><th>Mises à jour</th><th>Ignorées</th><th>Erreurs</th></tr></thead>
            <tbody>
              {logs.map((log) => {
                const errors = readImportErrors(log.errors);
                return (
                  <tr key={log.id}>
                    <td>{formatDateTime(log.createdAt)}</td>
                    <td>{log.kind === "TEACHERS" ? "Enseignants" : "Examens"}</td>
                    <td>{log.fileName}</td>
                    <td>
                      {log.status === "SUCCESS"
                        ? <StatusBadge label="Réussi" tone="green" />
                        : log.status === "PARTIAL"
                          ? <StatusBadge label="Partiel" tone="amber" />
                          : <StatusBadge label="Échec" tone="red" />}
                    </td>
                    <td>{log.createdRows}</td>
                    <td>{log.updatedRows}</td>
                    <td>{log.skippedRows}</td>
                    <td>
                      {log.errorRows}
                      {errors.length > 0 && (
                        <details>
                          <summary>Voir le détail</summary>
                          <ul className="details-list">
                            {errors.slice(0, 20).map((error, index) => (
                              <li key={`${error.row}-${index}`}>
                                {error.row > 0 ? `Ligne ${error.row} : ` : ""}{error.message}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </td>
                  </tr>
                );
              })}
              {logs.length === 0 && <tr><td colSpan={8} className="empty">Aucun import réalisé.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
