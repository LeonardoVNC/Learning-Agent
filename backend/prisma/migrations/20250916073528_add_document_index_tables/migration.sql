/*
  Warnings:

  - The values [LIST,CODE,FORMULA,METADATA] on the enum `ChunkType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."IndexStatus" AS ENUM ('GENERATING', 'GENERATED', 'ERROR', 'OUTDATED');

-- CreateEnum
CREATE TYPE "public"."ExerciseType" AS ENUM ('CONCEPTUAL', 'PRACTICAL', 'ANALYSIS', 'SYNTHESIS', 'APPLICATION', 'PROBLEM_SOLVING');

-- CreateEnum
CREATE TYPE "public"."ExerciseDifficulty" AS ENUM ('BASIC', 'INTERMEDIATE', 'ADVANCED');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."ChunkType_new" AS ENUM ('TEXT', 'TITLE', 'TABLE');
ALTER TYPE "public"."ChunkType" RENAME TO "ChunkType_old";
ALTER TYPE "public"."ChunkType_new" RENAME TO "ChunkType";
DROP TYPE "public"."ChunkType_old";
COMMIT;

-- CreateTable
CREATE TABLE "public"."document_indexes" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "public"."IndexStatus" NOT NULL DEFAULT 'GENERATED',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "config" JSONB,

    CONSTRAINT "document_indexes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."index_chapters" (
    "id" TEXT NOT NULL,
    "indexId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "index_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."index_subtopics" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "index_subtopics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."index_exercises" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT,
    "subtopicId" TEXT,
    "type" "public"."ExerciseType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" "public"."ExerciseDifficulty" NOT NULL,
    "estimatedTime" TEXT,
    "keywords" TEXT[],
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "index_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_indexes_documentId_key" ON "public"."document_indexes"("documentId");

-- CreateIndex
CREATE INDEX "document_indexes_documentId_idx" ON "public"."document_indexes"("documentId");

-- CreateIndex
CREATE INDEX "document_indexes_status_idx" ON "public"."document_indexes"("status");

-- CreateIndex
CREATE INDEX "index_chapters_indexId_order_idx" ON "public"."index_chapters"("indexId", "order");

-- CreateIndex
CREATE INDEX "index_subtopics_chapterId_order_idx" ON "public"."index_subtopics"("chapterId", "order");

-- CreateIndex
CREATE INDEX "index_exercises_chapterId_idx" ON "public"."index_exercises"("chapterId");

-- CreateIndex
CREATE INDEX "index_exercises_subtopicId_idx" ON "public"."index_exercises"("subtopicId");

-- CreateIndex
CREATE INDEX "index_exercises_type_idx" ON "public"."index_exercises"("type");

-- CreateIndex
CREATE INDEX "index_exercises_difficulty_idx" ON "public"."index_exercises"("difficulty");

-- AddForeignKey
ALTER TABLE "public"."document_indexes" ADD CONSTRAINT "document_indexes_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."index_chapters" ADD CONSTRAINT "index_chapters_indexId_fkey" FOREIGN KEY ("indexId") REFERENCES "public"."document_indexes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."index_subtopics" ADD CONSTRAINT "index_subtopics_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "public"."index_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."index_exercises" ADD CONSTRAINT "index_exercises_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "public"."index_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."index_exercises" ADD CONSTRAINT "index_exercises_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "public"."index_subtopics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
