-- ODS import'ta "Manuel" dolu (market + kategori kodu) çiftleri.
-- Bu kodlardan gelen yeni ürünler otomatik atanmaz, admin onayına düşer.
-- Bir kez çalıştırman yeterli (Prisma migrate kullanmıyorsan).

CREATE TABLE IF NOT EXISTS "MarketCategoryManuel" (
    "id" TEXT NOT NULL,
    "marketName" TEXT NOT NULL,
    "marketCategoryCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketCategoryManuel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarketCategoryManuel_marketName_marketCategoryCode_key"
ON "MarketCategoryManuel"("marketName", "marketCategoryCode");

CREATE INDEX IF NOT EXISTS "MarketCategoryManuel_marketName_marketCategoryCode_idx"
ON "MarketCategoryManuel"("marketName", "marketCategoryCode");
