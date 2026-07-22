CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
CREATE TYPE "AlertType" AS ENUM ('MISSING_AVAILABILITY', 'UNDERSTAFFED_EXAM', 'DOUBLE_ASSIGNMENT', 'UNAVAILABLE_TEACHER', 'QUOTA_EXCEEDED', 'EXTRA_TIME_UNDERSTAFFED', 'DATA_QUALITY');

CREATE TABLE "CampaignAlert" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "type" "AlertType" NOT NULL,
  "severity" "AlertSeverity" NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "resolutionUrl" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "resolvedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignAlert_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignAlert_campaignId_fingerprint_key" ON "CampaignAlert"("campaignId", "fingerprint");
CREATE INDEX "CampaignAlert_campaignId_resolvedAt_severity_idx" ON "CampaignAlert"("campaignId", "resolvedAt", "severity");
CREATE INDEX "CampaignAlert_type_createdAt_idx" ON "CampaignAlert"("type", "createdAt");

ALTER TABLE "CampaignAlert" ADD CONSTRAINT "CampaignAlert_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignAlert" ADD CONSTRAINT "CampaignAlert_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
