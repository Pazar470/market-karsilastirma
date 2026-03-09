-- CreateTable
CREATE TABLE "MarketCategoryMapping" (
    "id" TEXT NOT NULL,
    "marketName" TEXT NOT NULL,
    "marketCategoryCode" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketCategoryMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketCategoryMapping_marketName_marketCategoryCode_key" ON "MarketCategoryMapping"("marketName", "marketCategoryCode");

-- CreateIndex
CREATE INDEX "MarketCategoryMapping_marketName_marketCategoryCode_idx" ON "MarketCategoryMapping"("marketName", "marketCategoryCode");

-- AddForeignKey
ALTER TABLE "MarketCategoryMapping" ADD CONSTRAINT "MarketCategoryMapping_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
