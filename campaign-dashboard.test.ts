CREATE TYPE "ConfirmationStatus" AS ENUM ('PENDING', 'READ', 'CONFIRMED', 'DECLINED', 'REPLACED');

ALTER TABLE "Convocation"
  ADD COLUMN "confirmationStatus" "ConfirmationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "readAt" TIMESTAMP(3),
  ADD COLUMN "confirmedAt" TIMESTAMP(3),
  ADD COLUMN "declinedAt" TIMESTAMP(3),
  ADD COLUMN "declineComment" TEXT,
  ADD COLUMN "scheduleFingerprint" TEXT,
  ADD COLUMN "scheduleChangedAt" TIMESTAMP(3);

CREATE INDEX "Convocation_userId_confirmationStatus_idx"
  ON "Convocation"("userId", "confirmationStatus");
