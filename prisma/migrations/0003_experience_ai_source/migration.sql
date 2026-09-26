-- Reserve 'experience_ai' in KnownSource for the deferred free-text experience
-- onboarding step (spec Step 2). No writer exists yet; this only widens the
-- allowed set so the future parser needs no migration.
-- NOTE: done as create+swap (not ADD VALUE) because ADD VALUE cannot run
-- inside Prisma's migration transaction.
CREATE TYPE "KnownSource_new" AS ENUM ('background', 'taster', 'quiz', 'experience_ai');
ALTER TABLE "user_known_concepts" ALTER COLUMN "source" TYPE "KnownSource_new" USING "source"::text::"KnownSource_new";
ALTER TYPE "KnownSource" RENAME TO "KnownSource_old";
ALTER TYPE "KnownSource_new" RENAME TO "KnownSource";
DROP TYPE "KnownSource_old";
