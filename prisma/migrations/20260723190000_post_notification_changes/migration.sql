CREATE TABLE "PostNotificationChange" (
  "id" TEXT NOT NULL,
  "examId" TEXT NOT NULL,
  "requestedById" TEXT,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PREVIEW',
  "reason" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "snapshot" JSONB NOT NULL,
  "affectedUserIds" JSONB NOT NULL,
  "consequences" JSONB NOT NULL,
  "notificationErrors" INTEGER NOT NULL DEFAULT 0,
  "appliedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PostNotificationChange_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PostNotificationChange_examId_createdAt_idx"
  ON "PostNotificationChange"("examId", "createdAt");
CREATE INDEX "PostNotificationChange_status_createdAt_idx"
  ON "PostNotificationChange"("status", "createdAt");
CREATE INDEX "PostNotificationChange_requestedById_createdAt_idx"
  ON "PostNotificationChange"("requestedById", "createdAt");

ALTER TABLE "PostNotificationChange"
  ADD CONSTRAINT "PostNotificationChange_examId_fkey"
  FOREIGN KEY ("examId") REFERENCES "Exam"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PostNotificationChange"
  ADD CONSTRAINT "PostNotificationChange_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
