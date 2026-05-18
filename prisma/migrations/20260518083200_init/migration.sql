-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ContestStatus" AS ENUM ('draft', 'active', 'checking', 'finished', 'cancelled');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('pending', 'approved_start', 'approved_middle', 'approved_final', 'missing_account_1', 'missing_account_2', 'missing_both', 'not_found', 'not_eligible_final', 'winner_candidate', 'winner', 'rejected');

-- CreateEnum
CREATE TYPE "CheckStage" AS ENUM ('start', 'middle', 'final');

-- CreateEnum
CREATE TYPE "CheckResult" AS ENUM ('approved', 'missing_account_1', 'missing_account_2', 'missing_both', 'not_found');

-- CreateEnum
CREATE TYPE "ParseStatus" AS ENUM ('uploaded', 'parsed', 'failed');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('middle_reminder', 'status_update', 'winner_message', 'admin_alert');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('pending', 'sent', 'failed');

-- CreateEnum
CREATE TYPE "DrawStatus" AS ENUM ('candidate', 'confirmed', 'rejected', 'published', 'redrawn');

-- CreateEnum
CREATE TYPE "UserTelegramState" AS ENUM ('idle', 'awaiting_instagram');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "telegramUsername" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "telegramState" "UserTelegramState" NOT NULL DEFAULT 'idle',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instagramAccount1" TEXT NOT NULL,
    "instagramAccount2" TEXT NOT NULL,
    "status" "ContestStatus" NOT NULL DEFAULT 'active',
    "startAt" TIMESTAMP(3),
    "middleCheckAt" TIMESTAMP(3),
    "finalCheckAt" TIMESTAMP(3),
    "drawAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestEntry" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instagramUsername" TEXT NOT NULL,
    "normalizedInstagramUsername" TEXT NOT NULL,
    "status" "EntryStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContestEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "stage" "CheckStage" NOT NULL,
    "instagramAccount" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileName" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followersCount" INTEGER NOT NULL DEFAULT 0,
    "followers" JSONB,
    "parseStatus" "ParseStatus" NOT NULL DEFAULT 'uploaded',
    "parseError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramCheck" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "stage" "CheckStage" NOT NULL,
    "foundInAccount1" BOOLEAN NOT NULL,
    "foundInAccount2" BOOLEAN NOT NULL,
    "result" "CheckResult" NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstagramCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "text" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "telegramMessageId" BIGINT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawResult" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "winnerEntryId" TEXT NOT NULL,
    "eligibleCount" INTEGER NOT NULL,
    "seed" TEXT,
    "eligibleIds" JSONB,
    "drawnAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "status" "DrawStatus" NOT NULL DEFAULT 'candidate',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrawResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE INDEX "ContestEntry_contestId_status_idx" ON "ContestEntry"("contestId", "status");

-- CreateIndex
CREATE INDEX "ContestEntry_normalizedInstagramUsername_idx" ON "ContestEntry"("normalizedInstagramUsername");

-- CreateIndex
CREATE UNIQUE INDEX "ContestEntry_contestId_userId_key" ON "ContestEntry"("contestId", "userId");

-- CreateIndex
CREATE INDEX "ImportBatch_contestId_stage_instagramAccount_uploadedAt_idx" ON "ImportBatch"("contestId", "stage", "instagramAccount", "uploadedAt");

-- CreateIndex
CREATE INDEX "InstagramCheck_contestId_stage_idx" ON "InstagramCheck"("contestId", "stage");

-- CreateIndex
CREATE INDEX "InstagramCheck_entryId_stage_idx" ON "InstagramCheck"("entryId", "stage");

-- CreateIndex
CREATE INDEX "Notification_contestId_type_status_idx" ON "Notification"("contestId", "type", "status");

-- CreateIndex
CREATE INDEX "DrawResult_contestId_status_idx" ON "DrawResult"("contestId", "status");

-- AddForeignKey
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramCheck" ADD CONSTRAINT "InstagramCheck_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramCheck" ADD CONSTRAINT "InstagramCheck_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ContestEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawResult" ADD CONSTRAINT "DrawResult_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawResult" ADD CONSTRAINT "DrawResult_winnerEntryId_fkey" FOREIGN KEY ("winnerEntryId") REFERENCES "ContestEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
