-- Gedik İftarlık İri Piliç Kg: Daha önce kategori atandı mı?
-- Supabase → SQL Editor → bu sorguları yapıştır, Run.
--
-- Nasıl yorumlanır:
-- * categoryId ve category DOLU ise → Bu ürüne daha önce yol atanmış (başka bir kayıt da olabilir, 2. sorguya bak).
-- * Aynı isimde 2+ satır çıkarsa → Biri kategori almış biri almamış olabilir (farklı link/marketKey); admin "categoryId=null" olanı gösterir.
-- * categoryId NULL ise → Ya hiç atanmadı ya da farklı bir Product kaydına atanmış (duplicate).

-- 1) İsme göre ürün(ler) ve kategori bilgisi
SELECT
  p.id AS product_id,
  p.name AS product_name,
  p."categoryId",
  p.category AS category_ana_name,
  p."updatedAt" AS product_updated_at,
  (SELECT pr."marketCategoryCode"
   FROM "Price" pr
   WHERE pr."productId" = p.id
   ORDER BY pr.date DESC
   LIMIT 1) AS son_fiyat_kategori_kodu,
  (SELECT m.name
   FROM "Price" pr
   JOIN "Market" m ON m.id = pr."marketId"
   WHERE pr."productId" = p.id
   ORDER BY pr.date DESC
   LIMIT 1) AS son_fiyat_market
FROM "Product" p
WHERE p.name ILIKE '%Gedik%İftarlık%İri%Piliç%'
   OR p.name ILIKE '%Gedik İftarlık İri Piliç%'
ORDER BY p."updatedAt" DESC;

-- 2) Aynı isimde birden fazla kayıt var mı? (farklı marketKey = tekrarlar)
SELECT
  p.id,
  p.name,
  p."marketKey",
  p."categoryId",
  p.category,
  p."updatedAt"
FROM "Product" p
WHERE p.name ILIKE '%Gedik%İftarlık%Piliç%'
ORDER BY p.name, p."updatedAt" DESC;

-- 3) Bu ürünün (market + kategori kodu) Manuel'de mi Mapping'de mi?
-- Tek satır: kaynak = 'Manuel' veya 'Mapping' veya ikisi de boş
WITH prod AS (
  SELECT id FROM "Product" WHERE name ILIKE '%Gedik%İftarlık%Piliç%' LIMIT 1
),
son_fiyat AS (
  SELECT m.name AS market_name, pr."marketCategoryCode"
  FROM "Price" pr
  JOIN "Market" m ON m.id = pr."marketId"
  WHERE pr."productId" = (SELECT id FROM prod)
  ORDER BY pr.date DESC
  LIMIT 1
)
SELECT
  sf.market_name,
  sf."marketCategoryCode",
  CASE WHEN man.id IS NOT NULL THEN 'Manuel' ELSE NULL END AS manuel_var,
  CASE WHEN map.id IS NOT NULL THEN 'Mapping' ELSE NULL END AS mapping_var
FROM son_fiyat sf
LEFT JOIN "MarketCategoryManuel" man
  ON man."marketName" = sf.market_name AND man."marketCategoryCode" = sf."marketCategoryCode"
LEFT JOIN "MarketCategoryMapping" map
  ON map."marketName" = sf.market_name AND map."marketCategoryCode" = sf."marketCategoryCode";

-- 4) Bu ürünün kategori yolu (Ana > Yaprak > İnce yaprak)
WITH RECURSIVE path AS (
  SELECT id, name, "parentId", 0 AS depth
  FROM "Category"
  WHERE id = (SELECT "categoryId" FROM "Product" WHERE name ILIKE '%Gedik%İftarlık%Piliç%' LIMIT 1)
  UNION ALL
  SELECT c.id, c.name, c."parentId", p.depth + 1
  FROM "Category" c
  JOIN path p ON p."parentId" = c.id
)
SELECT
  (SELECT name FROM "Product" WHERE name ILIKE '%Gedik%İftarlık%Piliç%' LIMIT 1) AS urun_adi,
  (SELECT "categoryId" FROM "Product" WHERE name ILIKE '%Gedik%İftarlık%Piliç%' LIMIT 1) AS category_id,
  (SELECT string_agg(name, ' > ' ORDER BY depth DESC) FROM path) AS kategori_yolu;
