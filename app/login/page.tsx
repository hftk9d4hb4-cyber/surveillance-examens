import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureBootstrapAdmin } from "@/lib/bootstrap";
import { LoginForm } from "@/components/LoginForm";
import { Notice } from "@/components/Notice";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");
  const params = await searchParams;
  let bootstrap;
  try {
    bootstrap = await ensureBootstrapAdmin();
  } catch {
    bootstrap = { configured: false, created: false, activationSent: false, message: "La base de données n'est pas encore prête. Vérifiez le dernier déploiement Vercel." };
  }

  return (
    <main className="login-shell">
      <section className="card login-card">
        <div className="brand"><span className="brand-mark">SE</span><span>Surveillance des examens</span></div>
        <h1>Connexion</h1>
        <p className="muted">Faculté de médecine — gestion des disponibilités, affectations et convocations.</p>
        {params.activated === "1" && <Notice type="success">Votre mot de passe a été défini. Vous pouvez vous connecter.</Notice>}
        {bootstrap.message && <Notice type={bootstrap.configured ? "info" : "warning"}>{bootstrap.message}</Notice>}
        {!bootstrap.configured && <p><a href="/setup">Ouvrir le diagnostic d'installation</a></p>}
        <LoginForm />
      </section>
    </main>
  );
}
