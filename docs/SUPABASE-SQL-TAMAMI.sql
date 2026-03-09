-- Supabase'te boş projede tek seferde çalıştır.
-- Supabase Dashboard → SQL Editor → New query → yapıştır → Run.

-- 1) Tablolar
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Market" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Product" (
    "id" TEXT NOT NULL,
    "marketKey" TEXT,
    "name" TEXT NOT NULL,
    "barcode" TEXT,
    "imageUrl" TEXT,
    "category" TEXT,
    "quantityAmount" DOUBLE PRECISION,
    "quantityUnit" TEXT,
    "isSuspicious" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" TEXT,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Price" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productUrl" TEXT,
    "productId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "campaignAmount" DECIMAL(65,30),
    "campaignCondition" TEXT,
    "marketCategoryCode" TEXT,
    "marketCategoryPath" TEXT,
    CONSTRAINT "Price_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SmartAlarm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "targetPrice" DOUBLE PRECISION NOT NULL,
    "unitType" TEXT NOT NULL DEFAULT 'KG',
    "userId" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "includedProductIds" TEXT NOT NULL DEFAULT '[]',
    "excludedProductIds" TEXT NOT NULL DEFAULT '[]',
    "pendingProductIds" TEXT NOT NULL DEFAULT '[]',
    "isAllProducts" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SmartAlarm_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "alarmId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MarketCategoryMapping" (
    "id" TEXT NOT NULL,
    "marketName" TEXT NOT NULL,
    "marketCategoryCode" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketCategoryMapping_pkey" PRIMARY KEY ("id")
);

-- 2) Unique / Index
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Market_name_key" ON "Market"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "Product_marketKey_key" ON "Product"("marketKey");
CREATE UNIQUE INDEX IF NOT EXISTS "MarketCategoryMapping_marketName_marketCategoryCode_key" ON "MarketCategoryMapping"("marketName", "marketCategoryCode");
CREATE INDEX IF NOT EXISTS "Price_date_idx" ON "Price"("date");
CREATE INDEX IF NOT EXISTS "Price_productId_idx" ON "Price"("productId");
CREATE INDEX IF NOT EXISTS "Price_marketId_idx" ON "Price"("marketId");
CREATE INDEX IF NOT EXISTS "MarketCategoryMapping_marketName_marketCategoryCode_idx" ON "MarketCategoryMapping"("marketName", "marketCategoryCode");

-- 3) Foreign keys
ALTER TABLE "Product"  DROP CONSTRAINT IF EXISTS "Product_categoryId_fkey";
ALTER TABLE "Product"  ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_parentId_fkey";
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Price" DROP CONSTRAINT IF EXISTS "Price_productId_fkey";
ALTER TABLE "Price" ADD CONSTRAINT "Price_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Price" DROP CONSTRAINT IF EXISTS "Price_marketId_fkey";
ALTER TABLE "Price" ADD CONSTRAINT "Price_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SmartAlarm" DROP CONSTRAINT IF EXISTS "SmartAlarm_categoryId_fkey";
ALTER TABLE "SmartAlarm" ADD CONSTRAINT "SmartAlarm_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SmartAlarm" DROP CONSTRAINT IF EXISTS "SmartAlarm_userId_fkey";
ALTER TABLE "SmartAlarm" ADD CONSTRAINT "SmartAlarm_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_alarmId_fkey";
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_alarmId_fkey" FOREIGN KEY ("alarmId") REFERENCES "SmartAlarm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_userId_fkey";
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MarketCategoryMapping" DROP CONSTRAINT IF EXISTS "MarketCategoryMapping_categoryId_fkey";
ALTER TABLE "MarketCategoryMapping" ADD CONSTRAINT "MarketCategoryMapping_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
