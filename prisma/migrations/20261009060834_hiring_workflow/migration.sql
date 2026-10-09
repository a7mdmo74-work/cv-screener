-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "cvId" TEXT NOT NULL,
    "seniority" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "blueprintJson" TEXT NOT NULL,
    "questionsJson" TEXT NOT NULL DEFAULT '[]',
    "answerKeyJson" TEXT NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL,
    "variant" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Exam_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Exam_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "Cv" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExamAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examId" TEXT NOT NULL,
    "cvId" TEXT NOT NULL,
    "answersJson" TEXT NOT NULL,
    "practicalJson" TEXT NOT NULL,
    "gradedJson" TEXT NOT NULL,
    "rawScore" REAL NOT NULL,
    "percentage" REAL NOT NULL,
    "passMark" REAL NOT NULL,
    "blankCount" INTEGER NOT NULL,
    "wrongCount" INTEGER NOT NULL,
    "durationMin" REAL,
    "gradedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExamAttempt_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExamAttempt_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "Cv" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InterviewEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cvId" TEXT NOT NULL,
    "formTemplate" TEXT NOT NULL,
    "interviewDate" DATETIME NOT NULL,
    "location" TEXT NOT NULL,
    "interviewType" TEXT NOT NULL,
    "interviewersJson" TEXT NOT NULL,
    "ratingsJson" TEXT NOT NULL,
    "headerJson" TEXT NOT NULL DEFAULT '{}',
    "deptManagerNotes" TEXT NOT NULL,
    "hrRecommendation" TEXT NOT NULL,
    "computedJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InterviewEvaluation_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "Cv" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinalReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cvId" TEXT NOT NULL,
    "reportJson" TEXT NOT NULL,
    "pdfPath" TEXT,
    "docxPath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "language" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "inputsHash" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinalReport_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "Cv" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Decision" (
    "cvId" TEXT NOT NULL PRIMARY KEY,
    "outcome" TEXT NOT NULL,
    "conditionsJson" TEXT NOT NULL,
    "decidedBy" TEXT NOT NULL,
    "decidedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT NOT NULL,
    CONSTRAINT "Decision_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "Cv" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkflowTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "cvId" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "progress" TEXT NOT NULL DEFAULT 'Queued',
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "shortlisted" BOOLEAN NOT NULL DEFAULT false,
    "candidateStage" TEXT,
    CONSTRAINT "Cv_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Cv" ("anonymizedText", "completionTokens", "contactJson", "contentHash", "error", "extractionJson", "fileName", "filePath", "id", "jobId", "pagesJson", "parseStatus", "passAScore", "promptTokens", "rawText", "scoreJson", "stageStatus", "totalScore", "turboJson") SELECT "anonymizedText", "completionTokens", "contactJson", "contentHash", "error", "extractionJson", "fileName", "filePath", "id", "jobId", "pagesJson", "parseStatus", "passAScore", "promptTokens", "rawText", "scoreJson", "stageStatus", "totalScore", "turboJson" FROM "Cv";
DROP TABLE "Cv";
ALTER TABLE "new_Cv" RENAME TO "Cv";
CREATE INDEX "Cv_jobId_totalScore_idx" ON "Cv"("jobId", "totalScore");
CREATE INDEX "Cv_contentHash_idx" ON "Cv"("contentHash");
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workflowSettingsJson" TEXT NOT NULL DEFAULT '{}'
);
INSERT INTO "new_Job" ("createdAt", "cvsPerMinute", "deadlineAt", "description", "id", "lockedConcurrency", "rubricJson", "screeningStartedAt", "status", "title", "tokensPerSecond", "turboMode", "turboSettingsJson", "twoPass") SELECT "createdAt", "cvsPerMinute", "deadlineAt", "description", "id", "lockedConcurrency", "rubricJson", "screeningStartedAt", "status", "title", "tokensPerSecond", "turboMode", "turboSettingsJson", "twoPass" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Exam_cvId_version_key" ON "Exam"("cvId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "FinalReport_cvId_version_key" ON "FinalReport"("cvId", "version");

-- CreateIndex
CREATE INDEX "WorkflowTask_status_createdAt_idx" ON "WorkflowTask"("status", "createdAt");
