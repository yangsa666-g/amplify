CREATE TABLE "openai_compatible_models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "upstream_model_name" TEXT NOT NULL,
    "api_protocol" TEXT NOT NULL DEFAULT 'chat_completions',
    "encrypted_api_key" TEXT NOT NULL,
    "supports_reasoning" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "openai_compatible_models_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "openai_compatible_models_name_key" ON "openai_compatible_models"("name");
