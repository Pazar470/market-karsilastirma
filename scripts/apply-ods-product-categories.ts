/**
 * ODS/TSV'deki satırlara göre sadece Product.categoryId ve category günceller.
 * Category, MarketCategoryManuel, MarketCategoryMapping tablolarına DOKUNMAZ.
 * (Tarama sonrası ODS eşlemesi otomatik yapılır; manuel çalıştırmak için:)
 * Çalıştırma: npx tsx scripts/apply-ods-product-categories.ts "docs/tum_urunler_manuel.ods"
 *         veya npx tsx scripts/apply-ods-product-categories.ts "docs/export.tsv"
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { applyOdsProductCategories } from '../lib/category-sync';

const prisma = new PrismaClient();

async function main() {
    const fileArg = process.argv[2] || path.join(process.cwd(), 'docs', 'tum_urunler_manuel.ods');
    const filePath = path.resolve(process.cwd(), fileArg);
    if (!fs.existsSync(filePath)) {
        console.error('Dosya bulunamadı:', filePath);
        process.exit(1);
    }
    const updated = await applyOdsProductCategories(prisma, filePath);
    console.log('Bitti. Güncellenen ürün:', updated);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
