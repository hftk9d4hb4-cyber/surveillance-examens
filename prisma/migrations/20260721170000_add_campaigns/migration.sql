-- V1.2 alpha 1: campaigns. The Exam relation remains nullable so existing V1.1 data is preserved.
CREATE TYPE "CampaignStatus" AS ENUM ('PREPARATION', 'COLLECTING', 'ASSIGNING', 'PUBLISHED', 'CLOSED');

CREATE TABLE "Campaign" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "academicYear" TEXT NOT NULL,
  "promotion" TEXT NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "responseDeadline" DATE,
  "collectionStartedAt" TIMESTAMP(3),
  "status" "CampaignStatus" NOT NULL DEFAULT 'PREPARATION',
  "managerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Exam" ADD COLUMN "campaignId" TEXT;

CREATE UNIQUE INDEX "Campaign_academicYear_promotion_name_key" ON "Campaign"("academicYear", "promotion", "name");
CREATE INDEX "Campaign_academicYear_status_idx" ON "Campaign"("academicYear", "status");
CREATE INDEX "Campaign_managerId_status_idx" ON "Campaign"("managerId", "status");
CREATE INDEX "Campaign_startDate_endDate_idx" ON "Campaign"("startDate", "endDate");
CREATE INDEX "Exam_campaignId_date_idx" ON "Exam"("campaignId", "date");

ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_managerId_fkey"
  FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
