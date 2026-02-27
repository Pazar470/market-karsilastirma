/*
  Warnings:

  - A unique constraint covering the columns `[marketKey]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "marketKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Product_marketKey_key" ON "Product"("marketKey");
