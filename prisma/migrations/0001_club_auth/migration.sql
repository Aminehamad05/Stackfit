-- Club login: identity + password for organisation accounts (uni clubs).
-- Backfills the 8 seeded clubs in the same migration: email rule
-- info@<lowercased-alphanumeric-name>.com, password 'club2000' (bcrypt, cost 10).
-- Future clubs are created via the club portal with their own password.

ALTER TABLE "clubs" ADD COLUMN "email" TEXT;
ALTER TABLE "clubs" ADD COLUMN "password_hash" TEXT;

UPDATE "clubs" SET "email" = 'info@ieeeinsatstudentbranch.com', "password_hash" = '$2a$10$rPnkVBFp6LDshEdEM5KXEOlqpT1iVMQk.kit7aE/DzjNmpGXjq7XW' WHERE "name" = 'IEEE INSAT Student Branch';
UPDATE "clubs" SET "email" = 'info@ieeesupcomstudentbranch.com', "password_hash" = '$2a$10$rPnkVBFp6LDshEdEM5KXEOlqpT1iVMQk.kit7aE/DzjNmpGXjq7XW' WHERE "name" = 'IEEE SUP''COM Student Branch';
UPDATE "clubs" SET "email" = 'info@ieeeessthsstudentbranch.com', "password_hash" = '$2a$10$rPnkVBFp6LDshEdEM5KXEOlqpT1iVMQk.kit7aE/DzjNmpGXjq7XW' WHERE "name" = 'IEEE ESSTHS Student Branch';
UPDATE "clubs" SET "email" = 'info@ieeeisimmstudentbranch.com', "password_hash" = '$2a$10$rPnkVBFp6LDshEdEM5KXEOlqpT1iVMQk.kit7aE/DzjNmpGXjq7XW' WHERE "name" = 'IEEE ISIMM Student Branch';
UPDATE "clubs" SET "email" = 'info@ieeeenisstudentbranch.com', "password_hash" = '$2a$10$rPnkVBFp6LDshEdEM5KXEOlqpT1iVMQk.kit7aE/DzjNmpGXjq7XW' WHERE "name" = 'IEEE ENIS Student Branch';
UPDATE "clubs" SET "email" = 'info@ieeefststudentbranch.com', "password_hash" = '$2a$10$rPnkVBFp6LDshEdEM5KXEOlqpT1iVMQk.kit7aE/DzjNmpGXjq7XW' WHERE "name" = 'IEEE FST Student Branch';
UPDATE "clubs" SET "email" = 'info@ieeecsisimastudentbranchchapter.com', "password_hash" = '$2a$10$rPnkVBFp6LDshEdEM5KXEOlqpT1iVMQk.kit7aE/DzjNmpGXjq7XW' WHERE "name" = 'IEEE CS ISIMA Student Branch Chapter';
UPDATE "clubs" SET "email" = 'info@ieeecsepsstudentbranchchapter.com', "password_hash" = '$2a$10$rPnkVBFp6LDshEdEM5KXEOlqpT1iVMQk.kit7aE/DzjNmpGXjq7XW' WHERE "name" = 'IEEE CS EPS Student Branch Chapter';

-- Any club not matched above is a data bug: fail loudly instead of locking NULLs in.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "clubs" WHERE "email" IS NULL OR "password_hash" IS NULL) THEN
    RAISE EXCEPTION 'club_auth backfill missed clubs: %',
      (SELECT string_agg("name", ', ') FROM "clubs" WHERE "email" IS NULL OR "password_hash" IS NULL);
  END IF;
END $$;

ALTER TABLE "clubs" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "clubs" ALTER COLUMN "password_hash" SET NOT NULL;
CREATE UNIQUE INDEX "clubs_email_key" ON "clubs"("email");
