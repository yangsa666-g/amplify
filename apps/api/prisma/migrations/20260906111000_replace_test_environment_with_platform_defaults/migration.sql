-- Platform Defaults is the Super Admin default context and can run normal
-- business workflows. This hidden organization stores those workflow records
-- so tenant-owned tables continue to have a concrete organization_id.

INSERT INTO "organizations" ("id", "name", "status", "created_at", "updated_at")
VALUES ('platform_defaults', 'Platform Defaults', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

UPDATE "users" SET "organization_id" = 'platform_defaults' WHERE "organization_id" = 'test_environment';
UPDATE "field_templates" SET "organization_id" = 'platform_defaults' WHERE "organization_id" = 'test_environment';
UPDATE "prompt_templates" SET "organization_id" = 'platform_defaults' WHERE "organization_id" = 'test_environment';
UPDATE "documents" SET "organization_id" = 'platform_defaults' WHERE "organization_id" = 'test_environment';
UPDATE "analysis_jobs" SET "organization_id" = 'platform_defaults' WHERE "organization_id" = 'test_environment';
UPDATE "compare_jobs" SET "organization_id" = 'platform_defaults' WHERE "organization_id" = 'test_environment';
UPDATE "template_requests" SET "organization_id" = 'platform_defaults' WHERE "organization_id" = 'test_environment';
UPDATE "notifications" SET "organization_id" = 'platform_defaults' WHERE "organization_id" = 'test_environment';
UPDATE "api_keys" SET "organization_id" = 'platform_defaults' WHERE "organization_id" = 'test_environment';
UPDATE "openai_compatible_models" SET "organization_id" = 'platform_defaults' WHERE "organization_id" = 'test_environment';
UPDATE "organization_model_settings" SET "organization_id" = 'platform_defaults' WHERE "organization_id" = 'test_environment';
UPDATE "audit_logs" SET "organization_id" = 'platform_defaults' WHERE "organization_id" = 'test_environment';

DELETE FROM "organizations" WHERE "id" = 'test_environment';
