-- CreateTable
CREATE TABLE "analysis_job_feedbacks" (
    "id" TEXT NOT NULL,
    "analysis_job_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_job_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "analysis_job_feedbacks_analysis_job_id_user_id_key" ON "analysis_job_feedbacks"("analysis_job_id", "user_id");

-- AddForeignKey
ALTER TABLE "analysis_job_feedbacks" ADD CONSTRAINT "analysis_job_feedbacks_analysis_job_id_fkey" FOREIGN KEY ("analysis_job_id") REFERENCES "analysis_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_job_feedbacks" ADD CONSTRAINT "analysis_job_feedbacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
