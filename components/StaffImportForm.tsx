"use client";

import { useState, type FormEvent } from "react";

type Preview = {
  total: number; toCreate: number; existing: number; errors: number;
  errorDetails: { row: number; message: string }[];
  existingDetails: { row: number; email: string }[];
  preview: { name: string; email: string; department: string }[];
  token: string;
};

export function StaffImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [completed, setCompleted] = useState(false);

  async function send(action: "preview" | "confirm") {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("action", action);
      if (action === "confirm" && preview) form.append("token", preview.token);
      const result = await fetch("/api/import/staff", { method: "POST", body: form, credentials: "same-origin" });
      const json = await result.json();
      if (!result.ok) throw new Error(json.error || "Erreur de traitement.");
      if (action === "preview") { setPreview(json); setCompleted(false); }
      else { setCompleted(true); setPreview(null); setMessage(`${json.created} compte(s) MANAGER créé(s), ${json.alreadyExisting} compte(s) déjà existant(s). Aucun courriel envoyé.`); }
    } catch (e) { setMessage(e instanceof Error ? e.message : "Erreur inconnue."); }
    finally { setBusy(false); }
  }

  function previewFile(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void send("preview"); }

  return <div className="card">
    <h2>Import CSV des agents de scolarité</h2>
    <p>Les nouveaux agents seront créés avec le rôle MANAGER. Aucun compte existant ne sera modifié.</p>
    <div className="actions" style={{ marginBottom: 16 }}><a className="button secondary" href="/modeles/modele_agents_scolarite.csv" download>Télécharger le modèle CSV</a></div>
    <form onSubmit={previewFile}>
      <div className="field full"><label htmlFor="staff-file">Fichier des agents (.csv, 5 Mo maximum)</label>
        <input id="staff-file" type="file" accept=".csv,text/csv" required onChange={e => { setFile(e.target.files?.[0] || null); setPreview(null); setCompleted(false); setMessage(""); }} /></div>
      <button disabled={!file || busy}>Prévisualiser sans créer de compte</button>
    </form>
    {message && <p role="status">{message}</p>}
    {completed && <p>Vous pouvez maintenant envoyer les liens d’activation depuis la section dédiée ci-dessous.</p>}
    {preview && <div style={{ marginTop: 16 }}>
      <h3>Résultat de la prévisualisation</h3>
      <p>{preview.total} ligne(s) ; {preview.toCreate} nouveau(x) ; {preview.existing} déjà existant(s) ; {preview.errors} erreur(s).</p>
      {preview.errorDetails.length > 0 && <><h4>Erreurs à corriger</h4><ul>{preview.errorDetails.map((error, i) => <li key={i}>Ligne {error.row} : {error.message}</li>)}</ul></>}
      {preview.existingDetails.length > 0 && <><h4>Comptes existants non modifiés</h4><ul>{preview.existingDetails.map((entry, i) => <li key={i}>Ligne {entry.row} : {entry.email}</li>)}</ul></>}
      {preview.preview.length > 0 && <div className="table-wrap"><table><thead><tr><th>Nom</th><th>E-mail</th><th>Service</th><th>Rôle</th></tr></thead><tbody>{preview.preview.map((entry, i) => <tr key={i}><td>{entry.name}</td><td>{entry.email}</td><td>{entry.department}</td><td>MANAGER</td></tr>)}</tbody></table></div>}
      {preview.toCreate > preview.preview.length && <p>Seules les 50 premières créations sont affichées.</p>}
      <button disabled={busy || !!preview.errors || !preview.toCreate} onClick={() => void send("confirm")}>Confirmer la création des {preview.toCreate} compte(s)</button>
    </div>}
  </div>;
}
