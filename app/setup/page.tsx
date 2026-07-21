import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { setupTokenConfigured, setupTokenMatches, smtpConfigured } from "@/lib/env";
import { resendSetupLink } from "./actions";
import { Notice } from "@/components/Notice";

export const dynamic = "force-dynamic";

export default async function SetupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  if (!setupTokenConfigured() || !setupTokenMatches(token)) notFound();

  let databaseOk = false;
  let userCount = 0;
  let pendingBootstrap = false;
  try {
    const users = await prisma.user.findMany({
      select: { role: true, mustChangePassword: true },
      orderBy: { createdAt: "asc" },
      take: 2
    });
    userCount = await prisma.user.count();
    pendingBootstrap = users.length === 1 && users[0].role === "ADMIN" && users[0].mustChangePassword;
    databaseOk = true;
  } catch {
    databaseOk = false;
  }
  const message = typeof params.message === "string" ? params.message : "";
  return (
    <main className="container narrow">
      <div className="page-header"><div><h1>Diagnostic d’installation</h1><p className="muted">Accès protégé par le jeton d’installation.</p></div></div>
      {message && <Notice type={params.sent === "1" ? "success" : "warning"}>{message}</Notice>}
      <div className="card">
        <h2>État technique</h2>
        <ul className="details-list">
          <li>Base PostgreSQL : <strong>{databaseOk ? "accessible" : "non accessible"}</strong></li>
          <li>Utilisateurs créés : <strong>{databaseOk ? userCount : "—"}</strong></li>
          <li>SMTP : <strong>{smtpConfigured() ? "configuré" : "incomplet"}</strong></li>
        </ul>
      </div>
      {databaseOk && pendingBootstrap && smtpConfigured() && (
        <div className="card">
          <h2>Activation initiale</h2>
          <p>Renvoyer le lien d’activation au compte administrateur initial.</p>
          <form action={resendSetupLink}>
            <input type="hidden" name="setupToken" value={token} />
            <button>Renvoyer le lien</button>
          </form>
        </div>
      )}
      <p><Link href="/login">Retour à la connexion</Link></p>
    </main>
  );
}
