/**
 * Önce kategori/mapping verilerini temizler, sonra ODS import çalıştırır.
 * Detay: docs/ODS-IMPORT-NEREYE-YAZIYOR.md
 *
 * Kullanım:
 *   npx tsx scripts/clean-and-import-ods.ts "docs/tum_urunler_manuel.ods"
 *   npx tsx scripts/clean-and-import-ods.ts --clean-only   (sadece temizlik, import yok)
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    const args = process.argv.slice(2);
    const cleanOnly = args.includes('--clean-only');
    const odsPath = args.find((a) => a !== '--clean-only' && !a.startsWith('-'))
        || path.join(process.cwd(), 'docs', 'tum_urunler_manuel.ods');

    console.log('--- 1) Temizlik (kategori tarafı) ---');
    // Ürünlerin categoryId'sine DOKUNMA: Bir kez yol atanmış ürün bir daha admin onayına düşmemeli.
    // Sadece Mapping/Manuel silinir; import sadece ODS'te eşleşen ürünleri günceller, diğerleri olduğu gibi kalır.
    const m = await prisma.marketCategoryMapping.deleteMany({});
    console.log('  MarketCategoryMapping: silindi:', m.count);

    const manuel = await prisma.marketCategoryManuel.deleteMany({});
    console.log('  MarketCategoryManuel: silindi:', manuel.count);

    console.log('  (Category tablosu silinmedi; import ODS dışı kategorileri kendisi silecek.)');
    console.log('  (Product.categoryId/category dokunulmadı; bir kez atanan yol korunur.)');

    if (cleanOnly) {
        console.log('--clean-only: Sadece temizlik yapıldı. Import için komutu tekrar çalıştır (--clean-only olmadan).');
        return;
    }

    console.log('--- 2) ODS import ---');
    execSync(`npx tsx scripts/import-category-from-tsv.ts "${odsPath}"`, {
        stdio: 'inherit',
        cwd: process.cwd(),
    });
    console.log('Bitti.');
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
