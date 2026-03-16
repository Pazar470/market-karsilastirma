/**
 * DB üstünden birim fiyat kontrolü (READ-ONLY).
 * Kategori bazlı: sadece bizim kategori ağacımızdaki ilgili kategorilere bağlı ürünler kontrol edilir.
 *
 * Amaç:
 * - Full scan + upload SONRASINDA, aynı veritabanı snapshot'ı üzerinde
 *   parseQuantity / getUnitPrice kurallarını tekrar tekrar test etmek.
 * - Sürpriz yumurta / yumurtalı erişte gibi false positive'ler kategori filtresiyle elenir.
 *
 * Çalıştırma:
 *   npx tsx scripts/check-unit-prices-from-db.ts
 *
 * Çıktı:
 *   logs/unit-price-check.json
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { getUnitPrice } from '../lib/unit-price';
import { parseQuantity } from '../lib/utils';

const prisma = new PrismaClient();

/** Bizim Category tablosunda kontrol edilecek kategori slug'ları (yumurta, ton balığı alt kategorisi). */
const CHECK_SLUGS = ['yumurta', 'et-tavuk-balik-balik-ton-baligi'];

type SuspiciousRow = {
  productId: string;
  market: string;
  name: string;
  category: string | null;
  categorySlug: string | null;
  dbQuantityAmount: number | null;
  dbQuantityUnit: string | null;
  lastPrice: number;
  unitPriceValue: number;
  unitPriceDisplayUnit: string;
  reason: string;
};

/** Slug'a göre kategori ID'sini ve tüm alt kategori ID'lerini döndürür. */
async function getCategoryIdsBySlug(slug: string): Promise<string[]> {
  const cat = await prisma.category.findFirst({ where: { slug }, select: { id: true } });
  if (!cat) return [];
  const all = await prisma.category.findMany({ select: { id: true, parentId: true } });
  const children = new Set<string>();
  const collect = (id: string) => {
    children.add(id);
    all.filter((c) => c.parentId === id).forEach((c) => collect(c.id));
  };
  collect(cat.id);
  return Array.from(children);
}

async function getLastPricesForProducts(productIds: string[]) {
  const byProductId = new Map<string, { amount: number }>();
  const chunkSize = 500;
  for (let i = 0; i < productIds.length; i += chunkSize) {
    const chunk = productIds.slice(i, i + chunkSize);
    const prices = await prisma.price.findMany({
      where: { productId: { in: chunk } },
      orderBy: { date: 'desc' },
    });
    for (const p of prices) {
      if (!byProductId.has(p.productId)) {
        byProductId.set(p.productId, { amount: Number(p.amount) });
      }
    }
  }
  return byProductId;
}

async function main() {
  console.log('=== DB Birim Fiyat Kontrolü (READ-ONLY, kategori bazlı) ===');

  const allowedCategoryIds = new Set<string>();
  for (const slug of CHECK_SLUGS) {
    const ids = await getCategoryIdsBySlug(slug);
    ids.forEach((id) => allowedCategoryIds.add(id));
    console.log(`  Slug "${slug}": ${ids.length} kategori (kendisi + alt)`);
  }

  if (allowedCategoryIds.size === 0) {
    console.log('Uyarı: Hiç kategori bulunamadı (Category tablosu boş veya slug eşleşmedi). Şu slug\'lar arandı:', CHECK_SLUGS);
  }

  const products = await prisma.product.findMany({
    where: { categoryId: { in: Array.from(allowedCategoryIds) } },
    select: {
      id: true,
      name: true,
      category: true,
      categoryId: true,
      quantityAmount: true,
      quantityUnit: true,
    },
  });

  const categorySlugById = new Map<string, string>();
  if (allowedCategoryIds.size > 0) {
    const cats = await prisma.category.findMany({
      where: { id: { in: Array.from(allowedCategoryIds) } },
      select: { id: true, slug: true },
    });
    cats.forEach((c) => categorySlugById.set(c.id, c.slug));
  }

  console.log(`Toplam ürün (sadece bu kategorilere bağlı): ${products.length}`);
  if (products.length === 0) {
    console.log('Bu kategorilerde ürün yok veya ürünlerin categoryId atanmamış. Çıktı boş.');
    const outDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, 'unit-price-check.json'),
      JSON.stringify({ generatedAt: new Date().toISOString(), suspicious: [], message: 'Kategori bazlı filtre: eşleşen ürün yok.' }, null, 2),
      'utf-8'
    );
    return;
  }

  const productIds = products.map((p) => p.id);
  const lastPrices = await getLastPricesForProducts(productIds);

  const marketByProductId = new Map<string, string>();
  const priceRows = await prisma.price.findMany({
    where: { productId: { in: productIds } },
    select: { productId: true, marketId: true },
  });
  const markets = await prisma.market.findMany({
    select: { id: true, name: true },
  });
  const marketNameById = new Map(markets.map((m) => [m.id, m.name]));
  for (const row of priceRows) {
    if (!marketByProductId.has(row.productId)) {
      marketByProductId.set(row.productId, marketNameById.get(row.marketId) ?? row.marketId);
    }
  }

  const suspicious: SuspiciousRow[] = [];

  const slugYumurta = 'yumurta';
  const slugTonBaligi = 'et-tavuk-balik-balik-ton-baligi';

  for (const p of products) {
    const last = lastPrices.get(p.id);
    if (!last) continue;

    const marketName = marketByProductId.get(p.id) ?? 'Unknown';
    const qpAmount = p.quantityAmount ?? null;
    const qpUnit = p.quantityUnit ?? null;
    const unitPrice = getUnitPrice(last.amount, qpAmount, qpUnit, p.name);
    const categorySlug = p.categoryId ? categorySlugById.get(p.categoryId) ?? null : null;

    // 1) Yumurta kategorisindeyse birim adet olmalı
    if (categorySlug === slugYumurta && unitPrice.displayUnit !== 'adet') {
      suspicious.push({
        productId: p.id,
        market: marketName,
        name: p.name,
        category: p.category,
        categorySlug,
        dbQuantityAmount: qpAmount,
        dbQuantityUnit: qpUnit,
        lastPrice: last.amount,
        unitPriceValue: unitPrice.value,
        unitPriceDisplayUnit: unitPrice.displayUnit,
        reason: 'Yumurta kategorisi ama birim adet değil',
      });
      continue;
    }

    // 2) Ton balığı kategorisinde: DB miktarı ile isimden parse edilen tutarsızsa
    if (categorySlug === slugTonBaligi) {
      const nameQty = parseQuantity(p.name);
      if (nameQty.amount != null && nameQty.unit) {
        const dbKey = `${qpAmount ?? 'null'} ${qpUnit ?? ''}`.trim();
        const nameKey = `${nameQty.amount} ${nameQty.unit}`;
        if (dbKey && nameKey && dbKey !== nameKey) {
          suspicious.push({
            productId: p.id,
            market: marketName,
            name: p.name,
            category: p.category,
            categorySlug,
            dbQuantityAmount: qpAmount,
            dbQuantityUnit: qpUnit,
            lastPrice: last.amount,
            unitPriceValue: unitPrice.value,
            unitPriceDisplayUnit: unitPrice.displayUnit,
            reason: `Ton balığı: DB (${dbKey}) ≠ isimden (${nameKey})`,
          });
        }
      }
    }
  }

  const outDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'unit-price-check.json');
  fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), suspicious }, null, 2), 'utf-8');

  console.log(`Şüpheli kayıt sayısı: ${suspicious.length}`);
  console.log(`Detaylar: ${outPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

