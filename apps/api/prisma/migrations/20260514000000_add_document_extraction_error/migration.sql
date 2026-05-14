-- AlterTable: add extraction_error column to documents (idempotent)
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "extraction_error" TEXT;
