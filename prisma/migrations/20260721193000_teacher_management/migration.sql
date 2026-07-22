CREATE TYPE "AbsenceType" AS ENUM ('VACATION','CONFERENCE','TRAINING','MISSION','PERSONAL','OTHER');
CREATE TABLE "TeacherAbsence" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "AbsenceType" NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeacherAbsence_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TeacherPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "weekday" INTEGER NOT NULL,
  "halfDay" "HalfDay" NOT NULL,
  "weight" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeacherPreference_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TeacherAbsence_userId_startDate_endDate_idx" ON "TeacherAbsence"("userId","startDate","endDate");
CREATE INDEX "TeacherAbsence_startDate_endDate_idx" ON "TeacherAbsence"("startDate","endDate");
CREATE UNIQUE INDEX "TeacherPreference_userId_weekday_halfDay_key" ON "TeacherPreference"("userId","weekday","halfDay");
CREATE INDEX "TeacherPreference_weekday_halfDay_weight_idx" ON "TeacherPreference"("weekday","halfDay","weight");
ALTER TABLE "TeacherAbsence" ADD CONSTRAINT "TeacherAbsence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherPreference" ADD CONSTRAINT "TeacherPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
