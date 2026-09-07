CREATE TABLE "authentication_settings" (
    "id" TEXT NOT NULL DEFAULT 'platform',
    "local_auth_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authentication_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "authentication_settings" (
    "id",
    "local_auth_enabled",
    "created_at",
    "updated_at"
)
VALUES ('platform', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
