CREATE TABLE "AssignmentAcknowledgement" (
  "id" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssignmentAcknowledgement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssignmentAcknowledgement_assignmentId_key"
  ON "AssignmentAcknowledgement"("assignmentId");
CREATE INDEX "AssignmentAcknowledgement_userId_acknowledgedAt_idx"
  ON "AssignmentAcknowledgement"("userId", "acknowledgedAt");

ALTER TABLE "AssignmentAcknowledgement"
  ADD CONSTRAINT "AssignmentAcknowledgement_assignmentId_fkey"
  FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssignmentAcknowledgement"
  ADD CONSTRAINT "AssignmentAcknowledgement_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
