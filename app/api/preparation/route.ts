import { NextResponse } from "next/server";
import { getActiveApiUser, hasStaffRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { canAccessCampaign } from "@/lib/campaign-access";
import { loadPreparationReport } from "@/lib/preparation";

export async function GET(request: Request) {
  const actor = await getActiveApiUser();
  if (!actor || !hasStaffRole(actor.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const id = new URL(request.url).searchParams.get("campaignId");
  const campaign = id ? await prisma.campaign.findUnique({ where: { id } }) : null;
  if (!campaign) return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
  if (!canAccessCampaign(campaign.managerId, actor)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  return NextResponse.json(await loadPreparationReport({ academicYear: campaign.academicYear, campaignId: campaign.id }), { headers: { "Cache-Control": "no-store" } });
}
