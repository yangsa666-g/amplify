-- Dedicated tenant for Super Admin development and support testing.
-- It is a normal organization so business features continue to use the same
-- organization_id isolation path as customer tenants.

INSERT INTO "organizations" ("id", "name", "status", "created_at", "updated_at")
VALUES ('test_environment', 'Test Environment', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
