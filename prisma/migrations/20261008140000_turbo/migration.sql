-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rubricJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "twoPass" BOOLEAN NOT NULL DEFAULT false,
    "turboMode" BOOLEAN NOT NULL DEFAULT true,
    "turboSettingsJson" TEXT NOT NULL DEFAULT '{}',
    "screeningStartedAt" DATETIME,
    "deadlineAt" DATETIME,
    "lockedConcurrency" INTEGER,
    "cvsPerMinute" REAL,
    "tokensPerSecond" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Job" ("id", "title", "description", "rubricJson", "status", "twoPass", "turboMode", "turboSettingsJson", "createdAt")
SELECT "id", "title", "description", "rubricJson", "status", "twoPass", false, '{}', "createdAt" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";

CREATE TABLE "new_Cv" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "contentHash" TEXT,
    "rawText" TEXT NOT NULL DEFAULT '',
    "pagesJson" TEXT NOT NULL DEFAULT '[]',
    "anonymizedText" TEXT NOT NULL DEFAULT '',
    "contactJson" TEXT NOT NULL DEFAULT '{}',
    "parseStatus" TEXT NOT NULL DEFAULT 'pending',
    "extractionJson" TEXT,
    "scoreJson" TEXT,
    "turboJson" TEXT,
    "passAScore" REAL,
    "totalScore" REAL,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "stageStatus" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    CONSTRAINT "Cv_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Cv" ("id", "jobId", "fileName", "filePath", "rawText", "pagesJson", "anonymizedText", "parseStatus", "extractionJson", "scoreJson", "totalScore", "stageStatus", "error")
SELECT "id", "jobId", "fileName", "filePath", "rawText", "pagesJson", "anonymizedText", "parseStatus", "extractionJson", "scoreJson", "totalScore", "stageStatus", "error" FROM "Cv";
DROP TABLE "Cv";
ALTER TABLE "new_Cv" RENAME TO "Cv";
CREATE INDEX "Cv_jobId_totalScore_idx" ON "Cv"("jobId", "totalScore");
CREATE INDEX "Cv_contentHash_idx" ON "Cv"("contentHash");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
