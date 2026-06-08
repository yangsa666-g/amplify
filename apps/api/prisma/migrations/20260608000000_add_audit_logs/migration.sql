-- CreateTable
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "status_code" INTEGER NOT NULL,
    "duration_ms" INTEGER,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_method_created_at_idx" ON "audit_logs"("method", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_status_code_created_at_idx" ON "audit_logs"("status_code", "created_at");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
