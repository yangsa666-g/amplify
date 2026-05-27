-- AlterTable: record run timings in milliseconds (idempotent)
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "extraction_ms" INTEGER;
ALTER TABLE "analysis_jobs" ADD COLUMN IF NOT EXISTS "field_extraction_ms" INTEGER;
ALTER TABLE "analysis_jobs" ADD COLUMN IF NOT EXISTS "risk_analysis_ms" INTEGER;
