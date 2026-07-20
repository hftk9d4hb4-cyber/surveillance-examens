import { prisma } from "@/lib/prisma";
import { adminEmail, smtpConfigured } from "@/lib/env";
import { resendSetupLink } from "./actions";
import { Notice } from "@/components/Notice";

export const dynamic = "force-dynamic";

export default async function SetupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  let databaseOk = false;
  let userCount = 0;
  try {
    userCount = await prisma.user.count();
    databaseOk = true;
  } catch {
    databaseOk = false;
  }
  const message = typeof params.message === "string" ? params.message : "";
  return (
    <main className="container narrow">
      <div className="page-header"><div><h1>Diagnostic d'installation</h1><p className="muted">Cette page ne contient aucun secret.</p></div></div>
      {message && <Notice type={params.sent === "1" ? "success" : "warning"}>{message}</Notice>}
      <div className="card">
        <h2>État technique</h2>
        <ul className="details-list">
          <li>Base PostgreSQL : <strong>{databaseOk ? "accessible" : "non accessible"}</strong></li>
          <li>Utilisateurs créés : <strong>{databaseOk ? userCount : "—"}</strong></li>
          <li>SMTP Gmail : <strong>{smtpConfigured() ? "configuré" : "incomplet"}</strong></li>
          <li>Adresse administrateur : <strong>{adminEmail() || "non définie"}</strong></li>
        </ul>
      </div>
      {databaseOk && userCount === 1 && smtpConfigured() && <div className="card"><h2>Activation initiale</h2><p>Renvoyer le lien d'activation au seul administrateur existant.</p><form action={resendSetupLink}><button>Renvoyer le lien</button></form></div>}
      <p><a href="/login">Retour à la connexion</a></p>
    </main>
  );
}
