# Supabase SQL: Admin’e Düşmeyen Null Ürünler Tanısı

Bu sorguları Supabase **SQL Editor**’da çalıştır. Aynı veritabanına Vercel’in bağlandığından emin ol (Vercel env’deki `DATABASE_URL` = Supabase proje connection string).

---

## 1. Kaç tane categoryId=null ürün var?

```sql
SELECT COUNT(*) AS null_count
FROM "Product"
WHERE "categoryId" IS NULL;
```

Beklenti: Tarama sonrası kalan null sayısı (örn. 81).

---

## 2. Bu null ürünlerin kaçının “son 48 saatte” fiyatı var?

(Sunucu saati UTC kabul edilir; Supabase de UTC kullanır.)

```sql
SELECT COUNT(DISTINCT p.id) AS null_with_recent_price
FROM "Product" p
WHERE p."categoryId" IS NULL
  AND EXISTS (
    SELECT 1 FROM "Price" r
    WHERE r."productId" = p.id
      AND r.date >= (NOW() AT TIME ZONE 'UTC' - INTERVAL '48 hours')
  );
```

Beklenti: Admin’de listelenmesi gereken sayı (örn. 81). 0 ise ya tarih kesimi farklı ya da fiyat tarihleri 48 saatten eski.

---

## 3. Price’taki marketId’ler, Market tablosunda var mı?

Eğer Price’taki `marketId` değerleri Market’te yoksa, API market adı bulamaz (artık fallback ile yine de satır dönüyor olmalı).

```sql
SELECT DISTINCT r."marketId"
FROM "Price" r
WHERE r."productId" IN (
  SELECT id FROM "Product" WHERE "categoryId" IS NULL
)
AND r.date >= (NOW() AT TIME ZONE 'UTC' - INTERVAL '48 hours')
AND r."marketId" NOT IN (SELECT id FROM "Market");
```

Beklenti: 0 satır. Satır çıkıyorsa, o `marketId`’ler Market tablosunda yok demektir; Market kayıtlarını kontrol et.

---

## 4. Null ürünlerin son fiyatına göre market dağılımı

```sql
WITH last_price AS (
  SELECT DISTINCT ON ("productId")
    "productId", "marketId", "marketCategoryCode", date
  FROM "Price"
  WHERE "productId" IN (SELECT id FROM "Product" WHERE "categoryId" IS NULL)
  ORDER BY "productId", date DESC
)
SELECT m.name AS market_name, lp."marketCategoryCode", COUNT(*) AS product_count
FROM last_price lp
LEFT JOIN "Market" m ON m.id = lp."marketId"
GROUP BY m.name, lp."marketCategoryCode"
ORDER BY product_count DESC;
```

Beklenti: A101 ve Migros (ve varsa diğer marketler) satırları, kategori kodu ve ürün sayısıyla. `market_name` NULL olan satırlar = Market’te eşleşme yok.

---

## 5. Mapping senkronu etkisi: Hangi (market, kod) eşlenmiş?

```sql
SELECT mcm."marketName", mcm."marketCategoryCode", c.name AS category_name, mcm."updatedAt"
FROM "MarketCategoryMapping" mcm
JOIN "Category" c ON c.id = mcm."categoryId"
ORDER BY mcm."marketName", mcm."marketCategoryCode";
```

Mapping’te olan (market, kategori kodu) çiftleri tarama sonrası `syncMappingToNullProducts` ile null ürünlere uygulanır. Bu listede olmayan (market, kod) çiftleri admin’de “bekleyen” olarak görünmeli.

---

## 6. Özet: Null kalan ürünlerin (market, kod) özeti

```sql
WITH null_products AS (
  SELECT id FROM "Product" WHERE "categoryId" IS NULL
),
recent_prices AS (
  SELECT r."productId", r."marketId", r."marketCategoryCode",
         ROW_NUMBER() OVER (PARTITION BY r."productId" ORDER BY r.date DESC) AS rn
  FROM "Price" r
  WHERE r."productId" IN (SELECT id FROM null_products)
    AND r.date >= (NOW() AT TIME ZONE 'UTC' - INTERVAL '48 hours')
)
SELECT COALESCE(m.name, 'Market-YOK:' || rp."marketId") AS market_name,
       rp."marketCategoryCode",
       COUNT(*) AS product_count
FROM recent_prices rp
LEFT JOIN "Market" m ON m.id = rp."marketId"
WHERE rp.rn = 1
GROUP BY COALESCE(m.name, 'Market-YOK:' || rp."marketId"), rp."marketCategoryCode"
ORDER BY product_count DESC;
```

Beklenti: Admin’de görmek istediğin (market, kategori kodu) grupları. `market_name` içinde `Market-YOK:` varsa o marketId Market tablosunda yok demektir.

---

## Deploy sonrası API tanı

Admin girişi yaptıktan sonra tarayıcıda (veya Postman’de) şu adresi aç:

`https://<senin-vercel-domain>/api/admin/debug-pending`

Cookie ile giriş yapılı olmalı. Dönen JSON’da:

- `totalNull`: Toplam null ürün
- `nullWithRecentPrice`: Son 48 saatte fiyatı olan null ürün (bunlar listelenmeli)
- `keyCounts`: Hangi (market, kod) kaç ürün
- `skippedNoMarket`: Market bulunamadığı için sayıma girmeyen (artık fallback ile girmeli)
- `marketsFound`: Bulunan market adları

Eğer `nullWithRecentPrice` 0 ve `totalNull` 81 ise, sunucu tarafında 48 saat kesimi bu veritabanına göre hiç ürün bırakmıyor demektir (tarih/saat dilimi kontrolü gerekir).

---

## "Markette var, databasede yok" ne anlama gelebilir?

- **Hiç kayıt yok:** Ürün tarama sırasında hiç gelmedi. Olası nedenler: (1) O kategori bizim yaprak listemizde yok (kategori kaçırma), (2) O kategoride tarama hatası (scrape-offline-report.txt’te o kategori için hata satırı vardır), (3) Farklı veritabanı (tarama başka DB’ye yazıyorsa, canlı site başka DB’den okuyorsa).
- **Kayıt var ama categoryId dolu:** Daha önce mapping veya admin ile kategori atanmış; artık admin’de görünmez. Supabase’de `Product` tablosunda o ürünü id veya isimle ara, `categoryId` sütununa bak.
