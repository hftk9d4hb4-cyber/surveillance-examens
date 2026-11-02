import Link from "next/link";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { accountActivationState, activationStateLabels } from "@/lib/activation-status";
import { formatDateTime } from "@/lib/format";
import { Notice } from "@/components/Notice";

export const dynamic = "force-dynamic";
export default async function ActivationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const query = await searchParams;
  const role = query.role === "MANAGER" ? "MANAGER" : "TEACHER";
  const [users, deliveries] = await Promise.all([
    prisma.user.findMany({ where: { role }, select: { id: true, name: true, email: true, isActive: true, mustChangePassword: true, passwordHash: true, activationSentAt: true, activationTokens: { orderBy: { createdAt: "desc" }, take: 1, select: { expiresAt: true, usedAt: true } } }, orderBy: { name: "asc" } }),
    prisma.auditLog.findMany({ where: { action: { in: ["ACCOUNT_ACTIVATION_SENT", "ACCOUNT_ACTIVATION_FAILED"] }, entity: "User" }, orderBy: { createdAt: "desc" }, select: { entityId: true, action: true, createdAt: true } })
  ]);
  const latest = new Map<string, typeof deliveries[number]>();
  for (const d of deliveries) if (d.entityId && !latest.has(d.entityId)) latest.set(d.entityId, d);
  const now = new Date();
  const rows = users.map(u => ({ user: u, delivery: latest.get(u.id), state: accountActivationState({ ...u, hasPassword: Boolean(u.passwordHash), latestToken: u.activationTokens[0] || null, lastDelivery: latest.get(u.id)?.action }, now) }));
  const selected = typeof query.state === "string" && (["ALL", "PENDING"].includes(query.state) || Object.hasOwn(activationStateLabels, query.state)) ? query.state : "PENDING";
  const visible = rows.filter(r => selected === "ALL" || (selected === "PENDING" ? !["ACTIVATED", "INACTIVE"].includes(r.state) : r.state === selected));
  return <main className="container"><div className="page-header"><div><h1>Suivi des activations</h1><p>Consultez la validité des liens et relancez uniquement les comptes concernés.</p></div><Link className="button secondary" href="/preparation">Préparation</Link></div>
    {query.sent !== undefined && <Notice type={Number(query.failed) ? "warning" : "success"}>{query.sent} lien(s) envoyé(s), {query.failed || "0"} échec(s).</Notice>}
    <section className="card"><form action="/admin/activations" className="inline-form"><label htmlFor="activation-role">Comptes</label><select id="activation-role" name="role" defaultValue={role}><option value="TEACHER">Enseignants</option><option value="MANAGER">Agents de scolarité</option></select><label htmlFor="activation-state">État</label><select id="activation-state" name="state" defaultValue={selected}><option value="PENDING">À activer uniquement</option><option value="ALL">Tous les comptes</option>{Object.entries(activationStateLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><button>Afficher</button></form><p>{rows.filter(r => r.state === "ACTIVATED").length} compte(s) activé(s) · {rows.filter(r => r.state === "EXPIRED").length} lien(s) expiré(s) · {rows.filter(r => r.state === "FAILED").length} échec(s) récent(s).</p><p className="muted">Les derniers envois sont tracés individuellement à partir de cette version. Un envoi accepté par le serveur de messagerie ne prouve pas sa réception.</p></section>
    <section className="card"><div className="table-wrap"><table><thead><tr><th>Compte</th><th>État</th><th>Dernier envoi réussi</th><th>Expiration du lien</th><th>Action ciblée</th></tr></thead><tbody>{visible.map(({ user, state, delivery }) => <tr key={user.id}><th scope="row">{user.name}<br /><span className="muted">{user.email}</span></th><td>{activationStateLabels[state]}{delivery?.action === "ACCOUNT_ACTIVATION_FAILED" && <p>Dernier échec : {formatDateTime(delivery.createdAt)}</p>}</td><td>{formatDateTime(user.activationSentAt)}</td><td>{formatDateTime(user.activationTokens[0]?.expiresAt)}</td><td>{!["INACTIVE", "ACTIVATED"].includes(state) && <form action="/api/users/send-activations" method="post"><input type="hidden" name="userId" value={user.id} /><input type="hidden" name="targetRole" value={role} /><input type="hidden" name="resend" value="true" /><input type="hidden" name="returnTo" value="activations" /><button className="small">{state === "VALID" ? "Renvoyer un nouveau lien" : "Envoyer un lien"}</button></form>}</td></tr>)}{!visible.length && <tr><td colSpan={5}>Aucun compte correspondant.</td></tr>}</tbody></table></div></section></main>;
}
