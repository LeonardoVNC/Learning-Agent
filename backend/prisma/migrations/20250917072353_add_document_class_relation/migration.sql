-- AlterTable
ALTER TABLE "public"."Document" ADD COLUMN     "classId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."Classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
