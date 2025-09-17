BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE "public"."MCQ" (
    "questionId" TEXT PRIMARY KEY,
    "correctOptionIndex" INTEGER NOT NULL
);
CREATE TABLE "public"."MCQOption" (
    "id"   TEXT PRIMARY KEY,
    "mcqId" TEXT NOT NULL,
    "idx"  INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    CONSTRAINT "MCQOption_mcqId_idx_key" UNIQUE ("mcqId","idx")
);
CREATE TABLE "public"."TrueFalse" (
    "questionId" TEXT PRIMARY KEY,
    "answer" BOOLEAN NOT NULL
);
CREATE TABLE "public"."OpenAnalysis" (
    "questionId" TEXT PRIMARY KEY,
    "expectedAnswer" TEXT NOT NULL
);
CREATE TABLE "public"."OpenExercise" (
    "questionId" TEXT PRIMARY KEY,
    "expectedAnswer" TEXT NOT NULL
);

ALTER TABLE "public"."MCQ"
    ADD CONSTRAINT "MCQ_questionId_fkey"
    FOREIGN KEY ("questionId") REFERENCES "public"."ExamQuestion"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."MCQOption"
    ADD CONSTRAINT "MCQOption_mcqId_fkey"
    FOREIGN KEY ("mcqId") REFERENCES "public"."MCQ"("questionId")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."TrueFalse"
    ADD CONSTRAINT "TrueFalse_questionId_fkey"
    FOREIGN KEY ("questionId") REFERENCES "public"."ExamQuestion"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."OpenAnalysis"
    ADD CONSTRAINT "OpenAnalysis_questionId_fkey"
    FOREIGN KEY ("questionId") REFERENCES "public"."ExamQuestion"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."OpenExercise"
    ADD CONSTRAINT "OpenExercise_questionId_fkey"
    FOREIGN KEY ("questionId") REFERENCES "public"."ExamQuestion"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "MCQ_correctOptionIndex_idx" ON "public"."MCQ"("correctOptionIndex");
CREATE INDEX IF NOT EXISTS "MCQOption_mcqId_idx" ON "public"."MCQOption"("mcqId");

ALTER TABLE "public"."Exam"
    ADD COLUMN IF NOT EXISTS "title"  TEXT NOT NULL DEFAULT 'Examen',
    ADD COLUMN IF NOT EXISTS "status" "public"."ExamStorageStatus" NOT NULL DEFAULT 'Guardado',
    ADD COLUMN IF NOT EXISTS "classId" TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'Exam_classId_fkey'
        AND table_schema = 'public'
        AND table_name = 'Exam'
    ) THEN
        ALTER TABLE "public"."Exam"
        ADD CONSTRAINT "Exam_classId_fkey"
        FOREIGN KEY ("classId") REFERENCES "public"."Classes"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;


CREATE INDEX IF NOT EXISTS "Exam_classId_createdAt_idx" ON "public"."Exam"("classId","createdAt");
CREATE INDEX IF NOT EXISTS "Exam_title_idx" ON "public"."Exam"("title");
CREATE INDEX IF NOT EXISTS "Exam_difficulty_idx" ON "public"."Exam"("difficulty");

UPDATE "public"."Exam" e
SET "title"  = COALESCE(se."title", e."title"),
    "status" = COALESCE(se."status", e."status")
FROM "public"."SavedExam" se
WHERE se."examId" = e."id";

UPDATE "public"."Exam" e
SET "classId" = r.class_id
FROM (
    SELECT
        es.exam_id,
        c."id" AS class_id,
        ROW_NUMBER() OVER (
        PARTITION BY es.exam_id
        ORDER BY
            CASE WHEN es.created_at BETWEEN c."dateBegin" AND c."dateEnd" THEN 0 ELSE 1 END,
            ABS(EXTRACT(EPOCH FROM (es.created_at - c."dateBegin"))) ASC
        ) AS rn
    FROM (
        SELECT e2."id" AS exam_id, e2."createdAt" AS created_at, se."courseId" AS course_id
        FROM "public"."Exam" e2
        JOIN "public"."SavedExam" se ON se."examId" = e2."id"
    ) es
    JOIN "public"."Classes" c
        ON c."courseId" = es.course_id AND c."isActive" = TRUE
) r
WHERE e."id" = r.exam_id
    AND r.rn = 1
    AND e."classId" IS NULL;


INSERT INTO "public"."MCQ" ("questionId","correctOptionIndex")
SELECT q."id", COALESCE(q."correctOptionIndex", 0)
FROM "public"."ExamQuestion" q
WHERE q."kind" = 'MULTIPLE_CHOICE'
    AND NOT EXISTS (SELECT 1 FROM "public"."MCQ" m WHERE m."questionId" = q."id");

INSERT INTO "public"."MCQOption" ("id","mcqId","idx","text")
SELECT gen_random_uuid()::text,
    q."id",
    (opts.ordinality - 1)::int AS idx,
    opts.elem AS text
FROM "public"."ExamQuestion" q
CROSS JOIN LATERAL (
    SELECT t.elem, t.ordinality
    FROM jsonb_array_elements_text(
            COALESCE(q."options"::jsonb, '[]'::jsonb)
        ) WITH ORDINALITY AS t(elem, ordinality)
) AS opts
WHERE q."kind" = 'MULTIPLE_CHOICE'
    AND NOT EXISTS (SELECT 1 FROM "public"."MCQOption" mo WHERE mo."mcqId" = q."id");



INSERT INTO "public"."TrueFalse" ("questionId","answer")
SELECT q."id", COALESCE(q."correctBoolean", false)
FROM "public"."ExamQuestion" q
WHERE q."kind" = 'TRUE_FALSE'
    AND NOT EXISTS (SELECT 1 FROM "public"."TrueFalse" t WHERE t."questionId" = q."id");

INSERT INTO "public"."OpenAnalysis" ("questionId","expectedAnswer")
SELECT q."id", COALESCE(q."expectedAnswer",'')
FROM "public"."ExamQuestion" q
WHERE q."kind" = 'OPEN_ANALYSIS'
    AND NOT EXISTS (SELECT 1 FROM "public"."OpenAnalysis" oa WHERE oa."questionId" = q."id");

INSERT INTO "public"."OpenExercise" ("questionId","expectedAnswer")
SELECT q."id", COALESCE(q."expectedAnswer",'')
FROM "public"."ExamQuestion" q
WHERE q."kind" = 'OPEN_EXERCISE'
    AND NOT EXISTS (SELECT 1 FROM "public"."OpenExercise" oe WHERE oe."questionId" = q."id");

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "public"."Exam" WHERE "classId" IS NULL) THEN
        RAISE EXCEPTION 'Abort: % Exam rows without classId. Fill them and rerun migration.',
        (SELECT count(*)::text FROM "public"."Exam" WHERE "classId" IS NULL);
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='Exam_subject_idx') THEN
        EXECUTE 'DROP INDEX "public"."Exam_subject_idx"';
    END IF;
END $$;

ALTER TABLE "public"."Exam"
    DROP COLUMN IF EXISTS "approvedAt",
    DROP COLUMN IF EXISTS "mcqCount",
    DROP COLUMN IF EXISTS "openAnalysisCount",
    DROP COLUMN IF EXISTS "openExerciseCount",
    DROP COLUMN IF EXISTS "subject",
    DROP COLUMN IF EXISTS "totalQuestions",
    DROP COLUMN IF EXISTS "trueFalseCount";

ALTER TABLE "public"."ExamQuestion"
    DROP COLUMN IF EXISTS "correctBoolean",
    DROP COLUMN IF EXISTS "correctOptionIndex",
    DROP COLUMN IF EXISTS "expectedAnswer",
    DROP COLUMN IF EXISTS "options";

ALTER TABLE IF EXISTS "public"."SavedExam" DROP CONSTRAINT IF EXISTS "SavedExam_examId_fkey";
DROP TABLE IF EXISTS "public"."SavedExam";

ALTER TABLE "public"."Exam"
    ALTER COLUMN "classId" SET NOT NULL;

COMMIT;
