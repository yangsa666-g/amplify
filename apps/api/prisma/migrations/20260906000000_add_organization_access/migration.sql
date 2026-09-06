-- Company-level access control.
-- Existing data is moved into one legacy company, while existing platform Admin
-- accounts become Super Admins so they can be manually reassigned after release.

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'super_admin';

CREATE TYPE "OrganizationStatus" AS ENUM ('active', 'disabled');
CREATE TYPE "TemplateScope" AS ENUM ('platform', 'organization', 'personal');

CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "organizations_status_idx" ON "organizations"("status");

INSERT INTO "organizations" ("id", "name", "status", "created_at", "updated_at")
VALUES ('legacy_organization', 'Legacy Organization', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "users" ADD COLUMN "organization_id" TEXT;
ALTER TABLE "field_templates" ADD COLUMN "organization_id" TEXT;
ALTER TABLE "field_templates" ADD COLUMN "scope" "TemplateScope";
ALTER TABLE "prompt_templates" ADD COLUMN "organization_id" TEXT;
ALTER TABLE "prompt_templates" ADD COLUMN "scope" "TemplateScope";
ALTER TABLE "documents" ADD COLUMN "organization_id" TEXT;
ALTER TABLE "analysis_jobs" ADD COLUMN "organization_id" TEXT;
ALTER TABLE "compare_jobs" ADD COLUMN "organization_id" TEXT;
ALTER TABLE "template_requests" ADD COLUMN "organization_id" TEXT;
ALTER TABLE "notifications" ADD COLUMN "organization_id" TEXT;
ALTER TABLE "api_keys" ADD COLUMN "organization_id" TEXT;
ALTER TABLE "openai_compatible_models" ADD COLUMN "organization_id" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "organization_id" TEXT;

UPDATE "users" SET "organization_id" = 'legacy_organization';

UPDATE "field_templates"
SET
  "scope" = CASE
    WHEN "is_system" = true AND "name" = 'Default Contract Fields' THEN 'platform'::"TemplateScope"
    WHEN "is_system" = true THEN 'organization'::"TemplateScope"
    ELSE 'personal'::"TemplateScope"
  END,
  "organization_id" = CASE
    WHEN "is_system" = true AND "name" = 'Default Contract Fields' THEN NULL
    ELSE 'legacy_organization'
  END,
  "user_id" = CASE
    WHEN "is_system" = true THEN NULL
    ELSE "user_id"
  END,
  "is_system" = CASE
    WHEN "is_system" = true AND "name" = 'Default Contract Fields' THEN true
    ELSE false
  END;

UPDATE "prompt_templates"
SET
  "scope" = CASE
    WHEN "is_system" = true
      AND "name" IN ('Default Risk Analysis Prompt', 'Default Contract Comparison Prompt')
      THEN 'platform'::"TemplateScope"
    WHEN "is_system" = true THEN 'organization'::"TemplateScope"
    ELSE 'personal'::"TemplateScope"
  END,
  "organization_id" = CASE
    WHEN "is_system" = true
      AND "name" IN ('Default Risk Analysis Prompt', 'Default Contract Comparison Prompt')
      THEN NULL
    ELSE 'legacy_organization'
  END,
  "user_id" = CASE
    WHEN "is_system" = true THEN NULL
    ELSE "user_id"
  END,
  "is_system" = CASE
    WHEN "is_system" = true
      AND "name" IN ('Default Risk Analysis Prompt', 'Default Contract Comparison Prompt')
      THEN true
    ELSE false
  END;

UPDATE "documents" SET "organization_id" = 'legacy_organization';
UPDATE "analysis_jobs" SET "organization_id" = 'legacy_organization';
UPDATE "compare_jobs" SET "organization_id" = 'legacy_organization';
UPDATE "template_requests" SET "organization_id" = 'legacy_organization';
UPDATE "notifications" SET "organization_id" = 'legacy_organization';
UPDATE "api_keys" SET "organization_id" = 'legacy_organization';
UPDATE "openai_compatible_models" SET "organization_id" = 'legacy_organization';

-- Existing Admins become platform Super Admins. The legacy company may
-- temporarily have no company Admin; the UI/API lets Super Admins fix that.
UPDATE "users"
SET "role" = 'super_admin'::"Role", "organization_id" = NULL
WHERE "role" = 'admin'::"Role";

ALTER TABLE "field_templates" ALTER COLUMN "scope" SET DEFAULT 'personal';
ALTER TABLE "field_templates" ALTER COLUMN "scope" SET NOT NULL;
ALTER TABLE "prompt_templates" ALTER COLUMN "scope" SET DEFAULT 'personal';
ALTER TABLE "prompt_templates" ALTER COLUMN "scope" SET NOT NULL;
ALTER TABLE "documents" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "analysis_jobs" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "compare_jobs" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "template_requests" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "api_keys" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "openai_compatible_models" ALTER COLUMN "organization_id" SET NOT NULL;

CREATE TABLE "organization_model_settings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "label" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "default_reasoning_effort" TEXT,
    "sort_order" INTEGER,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_model_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "organization_model_settings"
  ("id", "organization_id", "model_name", "label", "enabled", "default_reasoning_effort", "sort_order", "is_default", "created_at", "updated_at")
SELECT
  'legacy_model_setting_' || md5("model_name"),
  'legacy_organization',
  "model_name",
  "label",
  "enabled",
  "default_reasoning_effort",
  "sort_order",
  "is_default",
  "created_at",
  "updated_at"
FROM "model_catalog_settings"
ON CONFLICT DO NOTHING;

UPDATE "model_catalog_settings"
SET "is_default" = false
WHERE "model_name" IN (SELECT "model_name" FROM "organization_model_settings" WHERE "organization_id" = 'legacy_organization');

DELETE FROM "refresh_tokens";

DROP INDEX IF EXISTS "openai_compatible_models_name_key";

CREATE INDEX "users_organization_id_role_status_idx" ON "users"("organization_id", "role", "status");
CREATE INDEX "field_templates_scope_organization_id_is_default_idx" ON "field_templates"("scope", "organization_id", "is_default");
CREATE INDEX "field_templates_organization_id_user_id_idx" ON "field_templates"("organization_id", "user_id");
CREATE INDEX "prompt_templates_scope_organization_id_template_type_is_default_idx" ON "prompt_templates"("scope", "organization_id", "template_type", "is_default");
CREATE INDEX "prompt_templates_organization_id_user_id_template_type_idx" ON "prompt_templates"("organization_id", "user_id", "template_type");
CREATE INDEX "documents_organization_id_user_id_created_at_idx" ON "documents"("organization_id", "user_id", "created_at");
CREATE INDEX "documents_organization_id_created_at_idx" ON "documents"("organization_id", "created_at");
CREATE INDEX "analysis_jobs_organization_id_user_id_created_at_idx" ON "analysis_jobs"("organization_id", "user_id", "created_at");
CREATE INDEX "analysis_jobs_organization_id_created_at_idx" ON "analysis_jobs"("organization_id", "created_at");
CREATE INDEX "compare_jobs_organization_id_user_id_created_at_idx" ON "compare_jobs"("organization_id", "user_id", "created_at");
CREATE INDEX "compare_jobs_organization_id_created_at_idx" ON "compare_jobs"("organization_id", "created_at");
CREATE INDEX "template_requests_organization_id_status_created_at_idx" ON "template_requests"("organization_id", "status", "created_at");
CREATE INDEX "notifications_organization_id_created_at_idx" ON "notifications"("organization_id", "created_at");
CREATE INDEX "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at");
CREATE INDEX "organization_model_settings_organization_id_enabled_sort_order_idx" ON "organization_model_settings"("organization_id", "enabled", "sort_order");
CREATE INDEX "organization_model_settings_organization_id_is_default_idx" ON "organization_model_settings"("organization_id", "is_default");

CREATE UNIQUE INDEX "api_keys_organization_id_key" ON "api_keys"("organization_id");
CREATE UNIQUE INDEX "organization_model_settings_organization_id_model_name_key" ON "organization_model_settings"("organization_id", "model_name");
CREATE UNIQUE INDEX "openai_compatible_models_organization_id_name_key" ON "openai_compatible_models"("organization_id", "name");

CREATE UNIQUE INDEX "field_templates_platform_default_key"
  ON "field_templates"("is_default")
  WHERE "scope" = 'platform' AND "is_default" = true;
CREATE UNIQUE INDEX "field_templates_organization_default_key"
  ON "field_templates"("organization_id", "is_default")
  WHERE "scope" = 'organization' AND "is_default" = true;
CREATE UNIQUE INDEX "prompt_templates_platform_default_key"
  ON "prompt_templates"("template_type", "is_default")
  WHERE "scope" = 'platform' AND "is_default" = true;
CREATE UNIQUE INDEX "prompt_templates_organization_default_key"
  ON "prompt_templates"("organization_id", "template_type", "is_default")
  WHERE "scope" = 'organization' AND "is_default" = true;
CREATE UNIQUE INDEX "organization_model_settings_default_key"
  ON "organization_model_settings"("organization_id", "is_default")
  WHERE "is_default" = true;

ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "field_templates" ADD CONSTRAINT "field_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prompt_templates" ADD CONSTRAINT "prompt_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "analysis_jobs" ADD CONSTRAINT "analysis_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compare_jobs" ADD CONSTRAINT "compare_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "template_requests" ADD CONSTRAINT "template_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "openai_compatible_models" ADD CONSTRAINT "openai_compatible_models_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_model_settings" ADD CONSTRAINT "organization_model_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "users" ADD CONSTRAINT "users_role_organization_check"
CHECK (
  ("role" = 'super_admin'::"Role" AND "organization_id" IS NULL)
  OR ("role" IN ('admin'::"Role", 'user'::"Role") AND "organization_id" IS NOT NULL)
);

ALTER TABLE "field_templates" ADD CONSTRAINT "field_templates_scope_owner_check"
CHECK (
  ("scope" = 'platform'::"TemplateScope" AND "organization_id" IS NULL AND "user_id" IS NULL AND "is_system" = true)
  OR ("scope" = 'organization'::"TemplateScope" AND "organization_id" IS NOT NULL AND "user_id" IS NULL AND "is_system" = false)
  OR ("scope" = 'personal'::"TemplateScope" AND "organization_id" IS NOT NULL AND "user_id" IS NOT NULL AND "is_system" = false)
);

ALTER TABLE "prompt_templates" ADD CONSTRAINT "prompt_templates_scope_owner_check"
CHECK (
  ("scope" = 'platform'::"TemplateScope" AND "organization_id" IS NULL AND "user_id" IS NULL AND "is_system" = true)
  OR ("scope" = 'organization'::"TemplateScope" AND "organization_id" IS NOT NULL AND "user_id" IS NULL AND "is_system" = false)
  OR ("scope" = 'personal'::"TemplateScope" AND "organization_id" IS NOT NULL AND "user_id" IS NOT NULL AND "is_system" = false)
);
