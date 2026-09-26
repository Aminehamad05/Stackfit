-- Growth tables: rule-based certifications + project suggestions (no AI).
-- Certification criteria and project requirements reference concept SLUGS
-- (resolved in code); see db/seed/certifications.json + project_suggestions.json.

CREATE TABLE "certifications" (
  "id" SERIAL NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "field_id" INTEGER,
  "level" "Level" NOT NULL DEFAULT 'beginner',
  "criteria" JSONB NOT NULL,
  "status" "ContentStatus" NOT NULL DEFAULT 'draft',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "certifications_slug_key" ON "certifications"("slug");

CREATE TABLE "user_certifications" (
  "user_id" INTEGER NOT NULL,
  "certification_id" INTEGER NOT NULL,
  "awarded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "evidence" JSONB,
  CONSTRAINT "user_certifications_pkey" PRIMARY KEY ("user_id", "certification_id")
);

CREATE TABLE "project_suggestions" (
  "id" SERIAL NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "field_id" INTEGER,
  "level" "Level" NOT NULL DEFAULT 'intermediate',
  "required_concepts" JSONB NOT NULL,
  "est_hours" DOUBLE PRECISION NOT NULL,
  "deliverable_hint" TEXT,
  "status" "ContentStatus" NOT NULL DEFAULT 'draft',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_suggestions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "project_suggestions_slug_key" ON "project_suggestions"("slug");

ALTER TABLE "certifications" ADD CONSTRAINT "certifications_field_id_fkey"
  FOREIGN KEY ("field_id") REFERENCES "fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_certifications" ADD CONSTRAINT "user_certifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_certifications" ADD CONSTRAINT "user_certifications_certification_id_fkey"
  FOREIGN KEY ("certification_id") REFERENCES "certifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_suggestions" ADD CONSTRAINT "project_suggestions_field_id_fkey"
  FOREIGN KEY ("field_id") REFERENCES "fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;
