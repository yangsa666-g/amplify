ALTER TYPE "TemplateType" ADD VALUE IF NOT EXISTS 'contract_comparison';

ALTER TABLE "analysis_jobs"
  ADD COLUMN IF NOT EXISTS "field_extraction_token_usage" JSONB,
  ADD COLUMN IF NOT EXISTS "risk_analysis_token_usage" JSONB;

-- The legacy comparison payload cannot be converted into an AI result.
-- Product policy explicitly discards those historical line-diff jobs.
DELETE FROM "compare_jobs";

ALTER TABLE "compare_jobs" DROP CONSTRAINT IF EXISTS "compare_jobs_old_document_id_fkey";
ALTER TABLE "compare_jobs" DROP CONSTRAINT IF EXISTS "compare_jobs_new_document_id_fkey";

ALTER TABLE "compare_jobs"
  DROP COLUMN IF EXISTS "old_document_id",
  DROP COLUMN IF EXISTS "new_document_id",
  DROP COLUMN IF EXISTS "diff_mode",
  DROP COLUMN IF EXISTS "diff_result_json",
  ADD COLUMN "model_name" TEXT NOT NULL,
  ADD COLUMN "reasoning_effort" TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN "prompt_template_id" TEXT,
  ADD COLUMN "prompt_snapshot_text" TEXT NOT NULL,
  ADD COLUMN "result_text" TEXT,
  ADD COLUMN "analysis_ms" INTEGER,
  ADD COLUMN "token_usage_json" JSONB;

DROP TYPE IF EXISTS "DiffMode";

CREATE TABLE "compare_job_documents" (
  "compare_job_id" TEXT NOT NULL,
  "document_id" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL,
  CONSTRAINT "compare_job_documents_pkey" PRIMARY KEY ("compare_job_id", "document_id")
);

CREATE UNIQUE INDEX "compare_job_documents_compare_job_id_sort_order_key"
  ON "compare_job_documents"("compare_job_id", "sort_order");

CREATE TABLE "compare_job_feedbacks" (
  "id" TEXT NOT NULL,
  "compare_job_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "compare_job_feedbacks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "compare_job_feedbacks_compare_job_id_user_id_key"
  ON "compare_job_feedbacks"("compare_job_id", "user_id");

ALTER TABLE "compare_jobs"
  ADD CONSTRAINT "compare_jobs_prompt_template_id_fkey"
  FOREIGN KEY ("prompt_template_id") REFERENCES "prompt_templates"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "compare_job_documents"
  ADD CONSTRAINT "compare_job_documents_compare_job_id_fkey"
  FOREIGN KEY ("compare_job_id") REFERENCES "compare_jobs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "compare_job_documents"
  ADD CONSTRAINT "compare_job_documents_document_id_fkey"
  FOREIGN KEY ("document_id") REFERENCES "documents"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "compare_job_feedbacks"
  ADD CONSTRAINT "compare_job_feedbacks_compare_job_id_fkey"
  FOREIGN KEY ("compare_job_id") REFERENCES "compare_jobs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "compare_job_feedbacks"
  ADD CONSTRAINT "compare_job_feedbacks_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
