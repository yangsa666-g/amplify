CREATE TABLE IF NOT EXISTS "model_catalog_settings" (
    "id" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "label" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "default_reasoning_effort" TEXT,
    "sort_order" INTEGER,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_catalog_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "model_catalog_settings_model_name_key" ON "model_catalog_settings"("model_name");
CREATE INDEX IF NOT EXISTS "model_catalog_settings_enabled_sort_order_idx" ON "model_catalog_settings"("enabled", "sort_order");
CREATE INDEX IF NOT EXISTS "model_catalog_settings_is_default_idx" ON "model_catalog_settings"("is_default");
