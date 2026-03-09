/**
 * Tatbikat için veriyi sıfırlar: ürün, fiyat, kategori, mapping, manuel, alarm, bildirim.
 * Market ve _prisma_migrations KALIR (marketler silinmez, şema dokunulmaz).
 *
 * Sıra: FK’lara göre Price → Product → SmartAlarm, Notification → MarketCategoryMapping → MarketCategoryManuel → Category
 *
 * Çalıştırma: npx tsx scripts/reset-for-tatbikat.ts
 * Sonrası: npx tsx scripts/clean-and-import-ods.ts "docs/tum_urunler_manuel.ods" → npx tsx scripts/run-full-scan-offline.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Tatbikat için veri sıfırlanıyor (Market kalacak) ---\n');

    console.log('1. Price…');
    const p = await prisma.price.deleteMany({});
    console.log('   silindi:', p.count);

    console.log('2. Product…');
    const prod = await prisma.product.deleteMany({});
    console.log('   silindi:', prod.count);

    console.log('3. SmartAlarm…');
    const a = await prisma.smartAlarm.deleteMany({});
    console.log('   silindi:', a.count);

    console.log('4. Notification…');
    const n = await prisma.notification.deleteMany({});
    console.log('   silindi:', n.count);

    console.log('5. MarketCategoryMapping…');
    const m = await prisma.marketCategoryMapping.deleteMany({});
    console.log('   silindi:', m.count);

    console.log('6. MarketCategoryManuel…');
    const man = await prisma.marketCategoryManuel.deleteMany({});
    console.log('   silindi:', man.count);

    console.log('7. Category…');
    const c = await prisma.category.deleteMany({});
    console.log('   silindi:', c.count);

    console.log('\n✅ Bitti. Market ve migration tabloları korundu.');
    console.log('Sonraki adım: clean-and-import-ods → run-full-scan-offline');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
