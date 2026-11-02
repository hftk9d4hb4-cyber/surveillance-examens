import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireStaff } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { canAccessCampaign } from "@/lib/campaign-access";
import { loadPreparationReport } from "@/lib/preparation";
import { PreparationReport } from "@/components/PreparationReport";
import { updateCampaignStatus } from "@/app/campaigns/actions";

export const dynamic = "force-dynamic";
export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireStaff();
  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) notFound();
  if (!canAccessCampaign(campaign.managerId, user)) redirect("/campaigns?error=access");
  const report = await loadPreparationReport({ academicYear: campaign.academicYear, campaignId: id });
  return <main className="container"><div className="page-header"><div><h1>Contrôle avant publication</h1><p>{campaign.name} · {campaign.academicYear}</p></div><div className="actions"><Link className="button secondary" href="/preparation">Préparation</Link><Link className="button secondary" href={`/campaigns/${id}/dashboard`}>Pilotage de campagne</Link></div></div><PreparationReport report={report} campaignId={id} year={campaign.academicYear} />{campaign.status === "ASSIGNING" && <section className="card"><h2>Publier la campagne</h2><form action={updateCampaignStatus}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="PUBLISHED" /><label><input type="checkbox" name="reviewConfirmed" value="true" required /> J’ai examiné le bilan et ses avertissements.</label><p><button disabled={!report.ready}>Publier la campagne</button></p></form><p>Cette publication n’envoie aucun courriel. Les convocations se déclenchent séparément après un nouveau contrôle.</p></section>}</main>;
}
