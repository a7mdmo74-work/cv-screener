-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rubricJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "twoPass" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Cv" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "rawText" TEXT NOT NULL DEFAULT '',
    "anonymizedText" TEXT NOT NULL DEFAULT '',
    "parseStatus" TEXT NOT NULL DEFAULT 'pending',
    "extractionJson" TEXT,
    "scoreJson" TEXT,
    "totalScore" REAL,
    "stageStatus" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    CONSTRAINT "Cv_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Cv_jobId_totalScore_idx" ON "Cv"("jobId", "totalScore");
