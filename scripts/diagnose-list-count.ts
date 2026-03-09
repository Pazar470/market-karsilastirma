/**
 * Liste neden boş? Ana sayfa sadece categoryId dolu + son 24 saatte fiyatı olan ürünleri gösterir.
 * Bu script bu sayıları çıkarır.
 * Çalıştırma: npx tsx scripts/diagnose-list-count.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const priceMinDate = new Date();
    priceMinDate.setDate(priceMinDate.getDate() - 1);

    const [totalProducts, withCategoryId, withRecentPrice, listCount] = await Promise.all([
        prisma.product.count(),
        prisma.product.count({ where: { categoryId: { not: null } } }),
        prisma.product.count({
            where: {
                prices: { some: { date: { gte: priceMinDate } } },
            },
        }),
        prisma.product.count({
            where: {
                categoryId: { not: null },
                isSuspicious: false,
                prices: { some: { date: { gte: priceMinDate } } },
            },
        }),
    ]);

    console.log('--- Liste sayım teşhisi ---');
    console.log('Toplam Product:', totalProducts);
    console.log('categoryId dolu:', withCategoryId);
    console.log('Son 24 saatte en az 1 fiyatı olan:', withRecentPrice);
    console.log('Listede görünecek (categoryId + son 24h fiyat + isSuspicious=false):', listCount);
    console.log('');
    if (listCount === 0 && withRecentPrice > 0 && withCategoryId === 0) {
        console.log('→ Sebep: Hiç ürünün categoryId’si yok. Mapping senkronu veya admin ataması gerekir.');
    } else if (listCount === 0 && withCategoryId > 0 && withRecentPrice === 0) {
        console.log('→ Sebep: Son 24 saatte fiyat kaydı yok. Yeni tarama fiyatları “date” ile yazılmış mı kontrol edin.');
    } else if (listCount === 0) {
        console.log('→ Sebep: Hem categoryId hem son 24h fiyat şartı sağlanan ürün yok.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
