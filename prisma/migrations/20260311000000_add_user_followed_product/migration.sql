-- CreateTable
CREATE TABLE "UserFollowedProduct" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFollowedProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserFollowedProduct_userId_productId_key" ON "UserFollowedProduct"("userId", "productId");

-- CreateIndex
CREATE INDEX "UserFollowedProduct_userId_idx" ON "UserFollowedProduct"("userId");

-- CreateIndex
CREATE INDEX "UserFollowedProduct_userId_categoryId_idx" ON "UserFollowedProduct"("userId", "categoryId");

-- AddForeignKey
ALTER TABLE "UserFollowedProduct" ADD CONSTRAINT "UserFollowedProduct_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFollowedProduct" ADD CONSTRAINT "UserFollowedProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
