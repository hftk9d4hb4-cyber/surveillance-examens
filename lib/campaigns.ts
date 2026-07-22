import type { CampaignStatus } from "@prisma/client";

export const CAMPAIGN_STATUSES: CampaignStatus[] = [
  "PREPARATION",
  "COLLECTING",
  "ASSIGNING",
  "PUBLISHED",
  "CLOSED"
];

export const campaignStatusLabels: Record<CampaignStatus, string> = {
  PREPARATION: "Préparation",
  COLLECTING: "Collecte des disponibilités",
  ASSIGNING: "Affectations",
  PUBLISHED: "Planning publié",
  CLOSED: "Clôturée"
};

const allowedTransitions: Record<CampaignStatus, CampaignStatus[]> = {
  PREPARATION: ["COLLECTING", "CLOSED"],
  COLLECTING: ["PREPARATION", "ASSIGNING", "CLOSED"],
  ASSIGNING: ["COLLECTING", "PUBLISHED", "CLOSED"],
  PUBLISHED: ["ASSIGNING", "CLOSED"],
  CLOSED: ["PREPARATION"]
};

export function canTransitionCampaign(from: CampaignStatus, to: CampaignStatus) {
  return from === to || allowedTransitions[from].includes(to);
}

export function campaignTone(status: CampaignStatus) {
  if (status === "CLOSED") return "blue" as const;
  if (status === "PUBLISHED") return "green" as const;
  if (status === "COLLECTING" || status === "ASSIGNING") return "amber" as const;
  return "blue" as const;
}

export function campaignContainsDate(startDate: Date, endDate: Date, date: Date) {
  const value = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const start = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const end = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
  return value >= start && value <= end;
}
