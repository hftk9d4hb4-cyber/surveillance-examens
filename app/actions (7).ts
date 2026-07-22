import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { formatDateTime } from "@/lib/format";
import { updateUser } from "./actions";
import { Notice } from "@/components/Notice";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const [users, auditLogs] = await Promise.all([
    prisma.user.findMany({ include: { assignments: true }, orderBy: [{ role: "asc" }, { lastName: "asc" }, { name: "asc" }] }),
    prisma.auditLog.findMany({ include: { actor: true }, orderBy: { createdAt: "desc" }, take: 30 })
  ]);
  return (
    <main className="container">
      <div className="page-header"><div><h1>Administration</h1><p className="muted">Gestion des droits, de l'activation des comptes et traçabilité des opérations.</p></div><Link className="button" href="/admin/imports">Imports</Link></div>
      {params.updated === "1" && <Notice type="success">Le compte a été mis à jour.</Notice>}
      {params.error === "self" && <Notice type="error">Vous ne pouvez pas désactiver votre propre compte administrateur ni retirer votre rôle.</Notice>}
      {params.error === "lastAdmin" && <Notice type="error">Au moins un administrateur actif doit être conservé.</Notice>}
      {params.error === "assigned" && <Notice type="error">Ce compte enseignant possède une surveillance à venir. Retirez ou réaffectez d’abord cette surveillance avant de désactiver le compte ou de changer son rôle.</Notice>}
      <div className="card"><h2>Utilisateurs</h2><div className="table-wrap"><table><thead><tr><th>Nom</th><th>Adresse</th><th>Service</th><th>État</th><th>Dernière connexion</th><th>Surveillances</th><th>Paramètres</th><th>Activation</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.name}</strong><br /><span className="muted">{user.speciality || ""}</span></td><td>{user.email}</td><td>{user.department || "—"}</td><td>{user.isActive ? <StatusBadge label="Actif" tone="green" /> : <StatusBadge label="Inactif" tone="red" />} {user.mustChangePassword && <StatusBadge label="À activer" tone="amber" />}</td><td>{formatDateTime(user.lastLoginAt)}</td><td>{user.assignments.length}</td><td><form action={updateUser} className="inline-form"><input type="hidden" name="id" value={user.id} /><select name="role" defaultValue={user.role}><option value="TEACHER">Enseignant</option><option value="MANAGER">Gestionnaire</option><option value="ADMIN">Administrateur</option></select><input name="quotaAnnual" type="number" min="0" max="100" defaultValue={user.quotaAnnual ?? ""} placeholder="Quota" style={{ width: 86 }} /><select name="isActive" defaultValue={user.isActive ? "true" : "false"}><option value="true">Actif</option><option value="false">Inactif</option></select><button className="small secondary">Enregistrer</button></form></td><td>{user.mustChangePassword && user.isActive ? <form action="/api/users/send-activations" method="post"><input type="hidden" name="userId" value={user.id} /><input type="hidden" name="resend" value="true" /><button className="small">Envoyer le lien</button></form> : "—"}</td></tr>)}</tbody></table></div></div>
      <div className="card"><h2>Journal d'audit</h2><div className="table-wrap"><table className="compact"><thead><tr><th>Date</th><th>Acteur</th><th>Action</th><th>Entité</th><th>Identifiant</th></tr></thead><tbody>{auditLogs.map((log) => <tr key={log.id}><td>{formatDateTime(log.createdAt)}</td><td>{log.actor?.name || "Système"}</td><td>{log.action}</td><td>{log.entity}</td><td><span className="code">{log.entityId || "—"}</span></td></tr>)}{auditLogs.length === 0 && <tr><td colSpan={5} className="empty">Aucune opération journalisée.</td></tr>}</tbody></table></div></div>
    </main>
  );
}
