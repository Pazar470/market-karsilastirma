/**
 * Category + MarketCategoryMapping + MarketCategoryManuel CSV'den geri yükleme.
 *
 * İki mod:
 * 1) Normal (varsayılan): Sadece upsert. DB'deki kategori ID'leri ile uyuşanlar eklenir; 325 CSV kategorisi farklı ID ise eklenmez.
 * 2) Tam restore: RESTORE_CATEGORY_FULL=1 + CONFIRM_DESTROY_PROD=1 ile. Category/Mapping/Manuel CSV ile değiştirilir;
 *    Product.categoryId sıfırlanır. Sonrasında full scan çalıştırılırsa ürünlere tekrar kategori atanır.
 *
 * Gerekli dosyalar (prisma/seed-data/):
 *   Category_backup.csv, MarketCategoryMapping_backup.csv, MarketCategoryManuel_backup.csv
 *
 * Normal:  npx tsx scripts/restore-category-mapping-from-csv.ts
 * Tam:     RESTORE_CATEGORY_FULL=1 CONFIRM_DESTROY_PROD=1 npx tsx scripts/restore-category-mapping-from-csv.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { parseCsvLine } from '../lib/csv-parse';
import { requireDestructiveConfirm } from '../lib/destructive-guard';

const prisma = new PrismaClient();
const SEED_DIR = path.join(process.cwd(), 'prisma', 'seed-data');

function readCsv(name: string): string[][] {
  const filePath = path.join(SEED_DIR, name);
  if (!fs.existsSync(filePath)) {
    console.warn(`[restore] Bulunamadı: ${name}`);
    return [];
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 2) continue;
    rows.push(cols);
  }
  console.log(`[restore] ${name}: ${rows.length} satır`);
  return rows;
}

type CatRow = { id: string; name: string; slug: string; parentId: string | null };

function sortCategoriesByParent(byId: Map<string, CatRow>, initialInserted: Set<string>): CatRow[] {
  const inserted = new Set(initialInserted);
  const sorted: CatRow[] = [];
  while (sorted.length < byId.size) {
    let added = 0;
    for (const row of byId.values()) {
      if (inserted.has(row.id)) continue;
      if (row.parentId && !inserted.has(row.parentId)) continue;
      sorted.push(row);
      inserted.add(row.id);
      added++;
    }
    if (added === 0) break;
  }
  return sorted;
}

async function runFullRestore(catRows: string[][], mapRows: string[][], manuelRows: string[][]) {
  requireDestructiveConfirm('scripts/restore-category-mapping-from-csv.ts (RESTORE_CATEGORY_FULL=1)');

  console.log('Product.categoryId nulllanıyor...');
  await prisma.product.updateMany({ data: { categoryId: null } });
  console.log('MarketCategoryMapping siliniyor...');
  await prisma.marketCategoryMapping.deleteMany({});
  console.log('MarketCategoryManuel siliniyor...');
  await prisma.marketCategoryManuel.deleteMany({});
  console.log('Category siliniyor...');
  await prisma.category.deleteMany({});

  const byId = new Map<string, CatRow>();
  for (const cols of catRows) {
    const [id, name, slug, parentId] = cols;
    if (!id || !name || !slug) continue;
    byId.set(id, { id, name, slug, parentId: parentId?.trim() || null });
  }
  const sorted = sortCategoriesByParent(byId, new Set());
  const sortedIds = new Set(sorted.map((r) => r.id));
  const remaining = [...byId.values()].filter((r) => !sortedIds.has(r.id));

  if (remaining.length > 0) {
    console.warn(`[restore] ${remaining.length} kategorinin parent'ı CSV'de yok; parentId=null ile kök olarak eklenecek.`);
  }
  console.log('Category ekleniyor (CSV sırasıyla)...');
  for (const row of sorted) {
    await prisma.category.create({
      data: { id: row.id, name: row.name, slug: row.slug, parentId: row.parentId },
    });
  }
  for (const row of remaining) {
    await prisma.category.create({
      data: { id: row.id, name: row.name, slug: row.slug, parentId: null },
    });
  }
  console.log('MarketCategoryMapping ekleniyor...');
  for (const cols of mapRows) {
    const [id, marketName, marketCategoryCode, categoryId] = cols;
    if (!id || !marketName || !marketCategoryCode || !categoryId) continue;
    await prisma.marketCategoryMapping.create({
      data: { id, marketName, marketCategoryCode, categoryId: categoryId.trim() },
    });
  }
  console.log('MarketCategoryManuel ekleniyor...');
  for (const cols of manuelRows) {
    const [id, marketName, marketCategoryCode] = cols;
    if (!id || !marketName || !marketCategoryCode) continue;
    await prisma.marketCategoryManuel.create({
      data: { id, marketName, marketCategoryCode },
    });
  }
  console.log('✅ Tam restore bitti. Ürün kategorileri sıfırlandı; sonra full scan çalıştırırsan tekrar atanır.');
}

async function main() {
  const catRows = readCsv('Category_backup.csv');
  const mapRows = readCsv('MarketCategoryMapping_backup.csv');
  const manuelRows = readCsv('MarketCategoryManuel_backup.csv');

  if (process.env.RESTORE_CATEGORY_FULL === '1') {
    if (catRows.length === 0 || mapRows.length === 0) {
      console.error('Tam restore için Category_backup.csv ve MarketCategoryMapping_backup.csv gerekli.');
      process.exit(1);
    }
    await runFullRestore(catRows, mapRows, manuelRows);
    return;
  }

  console.log('=== Category / Mapping geri yükleme (CSV upsert) ===\n');

  // —— 1. Category (parent önce; DB’deki ID’ler “inserted” başlangıcı) ——
  if (catRows.length > 0) {
    const byId = new Map<string, CatRow>();
    for (const cols of catRows) {
      const [id, name, slug, parentId] = cols;
      if (!id || !name || !slug) continue;
      byId.set(id, { id, name, slug, parentId: parentId?.trim() || null });
    }
    const existingIds = new Set((await prisma.category.findMany({ select: { id: true } })).map((c) => c.id));
    const sorted = sortCategoriesByParent(byId, existingIds);
    const skipped = byId.size - sorted.length;
    if (skipped > 0) console.warn(`[restore] ${skipped} kategori atlandı (parent yok).`);

    for (const row of sorted) {
      await prisma.category.upsert({
        where: { id: row.id },
        update: { name: row.name, slug: row.slug, parentId: row.parentId },
        create: { id: row.id, name: row.name, slug: row.slug, parentId: row.parentId },
      });
    }
    console.log('Kategori bitti.\n');
  }

  // —— 2. MarketCategoryMapping (sadece DB’de var olan categoryId) ——
  if (mapRows.length > 0) {
    const categoryIds = new Set((await prisma.category.findMany({ select: { id: true } })).map((c) => c.id));
    let skipped = 0;
    for (const cols of mapRows) {
      const [id, marketName, marketCategoryCode, categoryId] = cols;
      if (!id || !marketName || !marketCategoryCode || !categoryId) continue;
      const cid = categoryId.trim();
      if (!categoryIds.has(cid)) {
        skipped++;
        continue;
      }
      await prisma.marketCategoryMapping.upsert({
        where: { id },
        update: { marketName, marketCategoryCode, categoryId: cid },
        create: { id, marketName, marketCategoryCode, categoryId: cid },
      });
    }
    if (skipped > 0) console.warn(`[restore] Mapping: ${skipped} satır atlandı (categoryId yok).`);
    console.log('MarketCategoryMapping bitti.\n');
  }

  // —— 3. MarketCategoryManuel ——
  if (manuelRows.length > 0) {
    for (const cols of manuelRows) {
      const [id, marketName, marketCategoryCode] = cols;
      if (!id || !marketName || !marketCategoryCode) continue;
      await prisma.marketCategoryManuel.upsert({
        where: { id },
        update: { marketName, marketCategoryCode },
        create: { id, marketName, marketCategoryCode },
      });
    }
    console.log('MarketCategoryManuel bitti.\n');
  }

  console.log('✅ Geri yükleme tamamlandı.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
