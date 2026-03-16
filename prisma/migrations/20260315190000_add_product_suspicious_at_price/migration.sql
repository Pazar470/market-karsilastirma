-- AlterTable
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "suspiciousAtPrice" DECIMAL(65,30);
