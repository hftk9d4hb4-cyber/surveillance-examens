import Link from "next/link";
import { loadPreparationData } from "@/lib/preparation";
import { buildPreparationReport } from "@/lib/preparation-core";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { campaignStatusLabels } from "@/lib/campaigns";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export default async function PreparationPage() {
  const { user } = await requireStaff();
  const campaigns = await prisma.campaign.findMany({ where: { status: { not: "CLOSED" }, ...(user.role === "ADMIN" ? {} : { OR: [{ managerId: null }, { managerId: user.id }] }) }, orderBy: [{ startDate: "asc" }, { name: "asc" }], include: { _count: { select: { exams: true } } } });
  const years = [...new Set(campaigns.map(c => c.academicYear))];
  const inputs = new Map(await Promise.all(years.map(async academicYear => [academicYear, await loadPreparationData({ academicYear, ...(user.role === "MANAGER" ? { managerId: user.id } : {}) })] as const)));
  const reports = new Map(campaigns.map(c => {
    const data = inputs.get(c.academicYear)!;
    return [c.id, buildPreparationReport({ ...data, exams: data.exams.filter(e => e.campaignId === c.id) })];
  }));
  return <main className="container"><div className="page-header"><div><h1>Préparation des examens</h1><p className="muted">Choisissez une campagne pour retrouver les actions à traiter et le contrôle avant publication.</p></div><Link className="button secondary" href="/guide">Guide scolarité</Link></div><section className="card"><h2>Campagnes à préparer</h2><div className="table-wrap"><table><thead><tr><th>Campagne</th><th>Période</th><th>Statut</th><th>Examens publiés</th><th>À traiter</th><th>Actions</th></tr></thead><tbody>{campaigns.map(c => <tr key={c.id}><th scope="row">{c.name}<br /><span className="muted">{c.academicYear} · {c.promotion}</span></th><td>{formatDate(c.startDate)} – {formatDate(c.endDate)}</td><td>{campaignStatusLabels[c.status]}</td><td>{reports.get(c.id)!.examCount}</td><td>{reports.get(c.id)!.missingPosts} poste(s) vacant(s)<br />{reports.get(c.id)!.missingAvailability} disponibilité(s) incomplète(s)<br />{reports.get(c.id)!.failedConvocations} échec(s) d’envoi<br />{reports.get(c.id)!.pendingConvocations} convocation(s) à envoyer<br />{reports.get(c.id)!.pendingAcknowledgements} confirmation(s) attendue(s)</td><td><Link href={`/campaigns/${c.id}/review`}>Préparation et contrôle</Link> · <Link href={`/campaigns/${c.id}/reminders`}>Relances ciblées</Link></td></tr>)}{!campaigns.length && <tr><td colSpan={6}>Aucune campagne accessible en cours. <Link href="/campaigns">Créer ou consulter une campagne</Link></td></tr>}</tbody></table></div></section><section className="card"><h2>Raccourcis</h2><div className="actions"><Link className="button secondary" href="/assignments">Affectations et explications</Link><Link className="button secondary" href="/statistics">Bilan annuel d’équité</Link>{user.role === "ADMIN" && <Link className="button secondary" href="/admin/activations">Suivi des activations</Link>}</div></section></main>;
}
