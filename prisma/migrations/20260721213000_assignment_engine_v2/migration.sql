CREATE TABLE "AssignmentEngineConfig" (
  "id" TEXT NOT NULL,
  "academicYear" TEXT NOT NULL,
  "availabilityWeight" INTEGER NOT NULL DEFAULT 35,
  "quotaWeight" INTEGER NOT NULL DEFAULT 25,
  "fairnessWeight" INTEGER NOT NULL DEFAULT 20,
  "recencyWeight" INTEGER NOT NULL DEFAULT 10,
  "preferenceWeight" INTEGER NOT NULL DEFAULT 10,
  "extraTimeMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
  "maxAssignmentsPerDay" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssignmentEngineConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AssignmentEngineConfig_academicYear_key" ON "AssignmentEngineConfig"("academicYear");
CREATE INDEX "AssignmentEngineConfig_academicYear_idx" ON "AssignmentEngineConfig"("academicYear");

CREATE TABLE "AssignmentSimulation" (
  "id" TEXT NOT NULL,
  "academicYear" TEXT NOT NULL,
  "createdById" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PREVIEW',
  "parameters" JSONB NOT NULL,
  "result" JSONB NOT NULL,
  "anomalyCount" INTEGER NOT NULL DEFAULT 0,
  "assignmentCount" INTEGER NOT NULL DEFAULT 0,
  "validatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssignmentSimulation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AssignmentSimulation_academicYear_createdAt_idx" ON "AssignmentSimulation"("academicYear", "createdAt");
CREATE INDEX "AssignmentSimulation_createdById_createdAt_idx" ON "AssignmentSimulation"("createdById", "createdAt");
