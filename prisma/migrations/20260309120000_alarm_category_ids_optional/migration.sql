-- Add categoryIds (JSON array) and backfill from categoryId, then make categoryId optional
ALTER TABLE "SmartAlarm" ADD COLUMN IF NOT EXISTS "categoryIds" TEXT NOT NULL DEFAULT '[]';

-- Backfill: existing rows get categoryIds = [categoryId]
UPDATE "SmartAlarm"
SET "categoryIds" = json_build_array("categoryId")::text
WHERE "categoryId" IS NOT NULL AND ("categoryIds" = '[]' OR "categoryIds" IS NULL);

-- Make categoryId nullable
ALTER TABLE "SmartAlarm" ALTER COLUMN "categoryId" DROP NOT NULL;
