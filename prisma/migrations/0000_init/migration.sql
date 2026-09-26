-- pgvector extension (required by concepts.embedding vector(1024)).
-- Kept as the first statement of the first migration; compose uses pgvector/pgvector:pg16.
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('draft', 'ai_reviewed', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('beginner', 'intermediate', 'advanced');

-- CreateEnum
CREATE TYPE "BackgroundKind" AS ENUM ('uni_course', 'skill', 'experience');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('video', 'course', 'book', 'article');

-- CreateEnum
CREATE TYPE "PointEventType" AS ENUM ('quiz', 'interview', 'course_completed', 'github_push', 'project', 'taster');

-- CreateEnum
CREATE TYPE "UserTasterStatus" AS ENUM ('in_progress', 'submitted', 'reviewed');

-- CreateEnum
CREATE TYPE "KnownSource" AS ENUM ('background', 'taster', 'quiz');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('hackathon', 'networking', 'meetup', 'conference');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('draft', 'approved');

-- CreateEnum
CREATE TYPE "RoadmapStepStatus" AS ENUM ('locked', 'in_progress', 'quiz_passed', 'interview_passed');

-- CreateEnum
CREATE TYPE "AiReviewEntity" AS ENUM ('question', 'resource', 'concept', 'roadmap', 'taster');

-- CreateTable
CREATE TABLE "fields" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concepts" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "level" "Level" NOT NULL,
    "embedding" vector(1024),
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',

    CONSTRAINT "concepts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concept_prerequisites" (
    "concept_id" INTEGER NOT NULL,
    "prereq_id" INTEGER NOT NULL,

    CONSTRAINT "concept_prerequisites_pkey" PRIMARY KEY ("concept_id","prereq_id")
);

-- CreateTable
CREATE TABLE "field_concepts" (
    "field_id" INTEGER NOT NULL,
    "concept_id" INTEGER NOT NULL,
    "importance" INTEGER NOT NULL,

    CONSTRAINT "field_concepts_pkey" PRIMARY KEY ("field_id","concept_id")
);

-- CreateTable
CREATE TABLE "background_items" (
    "id" SERIAL NOT NULL,
    "kind" "BackgroundKind" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "background_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "background_item_concepts" (
    "item_id" INTEGER NOT NULL,
    "concept_id" INTEGER NOT NULL,
    "strength" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "background_item_concepts_pkey" PRIMARY KEY ("item_id","concept_id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "provider" TEXT,
    "type" "ResourceType" NOT NULL,
    "is_free" BOOLEAN NOT NULL,
    "price_cents" INTEGER,
    "currency" TEXT,
    "duration_min" INTEGER,
    "level" "Level" NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "verified_at" TIMESTAMPTZ,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concept_resources" (
    "concept_id" INTEGER NOT NULL,
    "resource_id" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "concept_resources_pkey" PRIMARY KEY ("concept_id","resource_id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" SERIAL NOT NULL,
    "concept_id" INTEGER NOT NULL,
    "stem" TEXT NOT NULL,
    "difficulty" "Level" NOT NULL,
    "explanation" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ai',
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_reviews" (
    "id" SERIAL NOT NULL,
    "entity_type" "AiReviewEntity" NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "issues" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "budget_cents" INTEGER NOT NULL DEFAULT 0,
    "github_login" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_background" (
    "user_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "confidence" INTEGER NOT NULL,
    "interest" INTEGER NOT NULL,

    CONSTRAINT "user_background_pkey" PRIMARY KEY ("user_id","item_id")
);

-- CreateTable
CREATE TABLE "user_field_matches" (
    "user_id" INTEGER NOT NULL,
    "field_id" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "explanation" TEXT,
    "chosen" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_field_matches_pkey" PRIMARY KEY ("user_id","field_id")
);

-- CreateTable
CREATE TABLE "roadmaps" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "field_id" INTEGER NOT NULL,
    "include_paid" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roadmaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_steps" (
    "roadmap_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "concept_id" INTEGER NOT NULL,
    "resource_id" INTEGER,
    "status" "RoadmapStepStatus" NOT NULL DEFAULT 'locked',

    CONSTRAINT "roadmap_steps_pkey" PRIMARY KEY ("roadmap_id","position")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "concept_id" INTEGER NOT NULL,
    "answers" JSONB NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "concept_id" INTEGER NOT NULL,
    "transcript" JSONB,
    "scores" JSONB,
    "model" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_events" (
    "id" BIGSERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" "PointEventType" NOT NULL,
    "points" INTEGER NOT NULL,
    "ref_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taster_projects" (
    "id" SERIAL NOT NULL,
    "field_id" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "level" "Level" NOT NULL DEFAULT 'beginner',
    "est_hours" DOUBLE PRECISION NOT NULL,
    "deliverable_type" TEXT NOT NULL,
    "starter_repo_url" TEXT,
    "rubric" JSONB NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',

    CONSTRAINT "taster_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taster_resources" (
    "taster_id" INTEGER NOT NULL,
    "resource_id" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "taster_resources_pkey" PRIMARY KEY ("taster_id","resource_id")
);

-- CreateTable
CREATE TABLE "taster_concepts" (
    "taster_id" INTEGER NOT NULL,
    "concept_id" INTEGER NOT NULL,

    CONSTRAINT "taster_concepts_pkey" PRIMARY KEY ("taster_id","concept_id")
);

-- CreateTable
CREATE TABLE "user_known_concepts" (
    "user_id" INTEGER NOT NULL,
    "concept_id" INTEGER NOT NULL,
    "source" "KnownSource" NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_known_concepts_pkey" PRIMARY KEY ("user_id","concept_id","source")
);

-- CreateTable
CREATE TABLE "user_tasters" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "taster_id" INTEGER NOT NULL,
    "status" "UserTasterStatus" NOT NULL DEFAULT 'in_progress',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMPTZ,
    "submission_url" TEXT,
    "submission_text" TEXT,
    "enjoyment" INTEGER,
    "difficulty" INTEGER,
    "would_continue" BOOLEAN,
    "reflection" TEXT,
    "ai_review" JSONB,
    "performance" DOUBLE PRECISION,

    CONSTRAINT "user_tasters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clubs" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "contact_email" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "city" TEXT,
    "country" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ,
    "url" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'draft',
    "club_id" INTEGER,
    "field_id" INTEGER,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_events" (
    "user_id" INTEGER NOT NULL,
    "event_id" INTEGER NOT NULL,

    CONSTRAINT "user_events_pkey" PRIMARY KEY ("user_id","event_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fields_slug_key" ON "fields"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "concepts_slug_key" ON "concepts"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "background_items_kind_name_key" ON "background_items"("kind", "name");

-- CreateIndex
CREATE INDEX "questions_concept_id_idx" ON "questions"("concept_id");

-- CreateIndex
CREATE INDEX "questions_status_idx" ON "questions"("status");

-- CreateIndex
CREATE INDEX "question_options_question_id_idx" ON "question_options"("question_id");

-- CreateIndex
CREATE INDEX "ai_reviews_entity_type_entity_id_idx" ON "ai_reviews"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "point_events_user_id_type_ref_id_key" ON "point_events"("user_id", "type", "ref_id");

-- CreateIndex
CREATE UNIQUE INDEX "taster_projects_slug_key" ON "taster_projects"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "user_tasters_user_id_taster_id_key" ON "user_tasters"("user_id", "taster_id");

-- CreateIndex
CREATE UNIQUE INDEX "clubs_name_key" ON "clubs"("name");

-- CreateIndex
CREATE INDEX "events_status_idx" ON "events"("status");

-- CreateIndex
CREATE INDEX "events_club_id_idx" ON "events"("club_id");

-- AddForeignKey
ALTER TABLE "concept_prerequisites" ADD CONSTRAINT "concept_prerequisites_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_prerequisites" ADD CONSTRAINT "concept_prerequisites_prereq_id_fkey" FOREIGN KEY ("prereq_id") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_concepts" ADD CONSTRAINT "field_concepts_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_concepts" ADD CONSTRAINT "field_concepts_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "background_item_concepts" ADD CONSTRAINT "background_item_concepts_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "background_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "background_item_concepts" ADD CONSTRAINT "background_item_concepts_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_resources" ADD CONSTRAINT "concept_resources_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_resources" ADD CONSTRAINT "concept_resources_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_background" ADD CONSTRAINT "user_background_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_background" ADD CONSTRAINT "user_background_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "background_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_field_matches" ADD CONSTRAINT "user_field_matches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_field_matches" ADD CONSTRAINT "user_field_matches_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmaps" ADD CONSTRAINT "roadmaps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmaps" ADD CONSTRAINT "roadmaps_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_steps" ADD CONSTRAINT "roadmap_steps_roadmap_id_fkey" FOREIGN KEY ("roadmap_id") REFERENCES "roadmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_steps" ADD CONSTRAINT "roadmap_steps_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_steps" ADD CONSTRAINT "roadmap_steps_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_events" ADD CONSTRAINT "point_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taster_projects" ADD CONSTRAINT "taster_projects_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taster_resources" ADD CONSTRAINT "taster_resources_taster_id_fkey" FOREIGN KEY ("taster_id") REFERENCES "taster_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taster_resources" ADD CONSTRAINT "taster_resources_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taster_concepts" ADD CONSTRAINT "taster_concepts_taster_id_fkey" FOREIGN KEY ("taster_id") REFERENCES "taster_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taster_concepts" ADD CONSTRAINT "taster_concepts_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_known_concepts" ADD CONSTRAINT "user_known_concepts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_known_concepts" ADD CONSTRAINT "user_known_concepts_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tasters" ADD CONSTRAINT "user_tasters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tasters" ADD CONSTRAINT "user_tasters_taster_id_fkey" FOREIGN KEY ("taster_id") REFERENCES "taster_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_events" ADD CONSTRAINT "user_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_events" ADD CONSTRAINT "user_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- F12: exactly one correct option per question (partial unique index).
-- Prisma cannot express partial indexes, so it is hand-maintained here.
CREATE UNIQUE INDEX one_correct_option ON "question_options"("question_id") WHERE "is_correct";
