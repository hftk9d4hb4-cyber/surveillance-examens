import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { ActivationForm } from "@/components/ActivationForm";
import { Notice } from "@/components/Notice";

export const dynamic = "force-dynamic";

export default async function ActivationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const activation = await prisma.activationToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  const valid = Boolean(activation && !activation.usedAt && activation.expiresAt > new Date() && activation.user.isActive);
  return (
    <main className="login-shell"><section className="card login-card"><div className="brand"><span className="brand-mark">SE</span><span>Surveillance des examens</span></div><h1>Activation du compte</h1>{valid && activation ? <><p>Bonjour {activation.user.name}. Définissez votre mot de passe.</p><ActivationForm token={token} /></> : <Notice type="error">Ce lien est invalide ou expiré. Demandez un nouveau lien à la scolarité.</Notice>}</section></main>
  );
}
