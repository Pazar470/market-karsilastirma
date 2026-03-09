-- Price tablosunda eksik sütunları ekler (Prisma şemasıyla uyum için).
-- Supabase Dashboard → SQL Editor → yapıştır → Run.
-- Zaten varsa "column already exists" uyarısı alabilirsin, yok say.

ALTER TABLE "Price" ADD COLUMN IF NOT EXISTS "marketCategoryCode" TEXT;
ALTER TABLE "Price" ADD COLUMN IF NOT EXISTS "marketCategoryPath" TEXT;
ALTER TABLE "Price" ADD COLUMN IF NOT EXISTS "campaignAmount" DECIMAL(65,30);
ALTER TABLE "Price" ADD COLUMN IF NOT EXISTS "campaignCondition" TEXT;
