/**
 * Tam tatbikat tek komut: Veriyi sıfırla → ODS import → Tam tarama (mapping senkronu otomatik).
 * Tek process = tek DB connection pool (Supabase max clients sorununu azaltır).
 *
 * Önce Prisma Studio / başka DB istemcilerini kapat.
 * Çalıştırma: npx tsx scripts/run-full-tatbikat.ts
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ODS_PATH = path.join(process.cwd(), 'docs', 'tum_urunler_manuel.ods');

async function reset() {
    console.log('\n=== 1/3 Veri sıfırlama ===\n');
    await prisma.price.deleteMany({});
    console.log('  Price silindi');
    await prisma.product.deleteMany({});
    console.log('  Product silindi');
    await prisma.smartAlarm.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.marketCategoryMapping.deleteMany({});
    console.log('  MarketCategoryMapping silindi');
    await prisma.marketCategoryManuel.deleteMany({});
    console.log('  MarketCategoryManuel silindi');
    await prisma.category.deleteMany({});
    console.log('  Category silindi');
    console.log('  Market korundu.\n');
}

async function main() {
    console.log('=== TAM TATBİKAT (reset → ODS import → tam tarama) ===');
    const start = Date.now();

    await reset();

    console.log('=== 2/3 ODS import ===\n');
    if (!fs.existsSync(ODS_PATH)) {
        console.error('ODS dosyası bulunamadı:', ODS_PATH);
        console.error('Tatbikat ODS olmadan devam edemez. Dosyayı koyup tekrar çalıştır.');
        process.exit(1);
    }
    execSync(`npx tsx scripts/import-category-from-tsv.ts "${ODS_PATH}"`, {
        stdio: 'inherit',
        cwd: process.cwd(),
    });

    console.log('\n=== 3/3 Tam tarama (indirme → upload → mapping senkronu → alarm) ===\n');
    execSync('npx tsx scripts/run-full-scan-offline.ts', {
        stdio: 'inherit',
        cwd: process.cwd(),
        timeout: 45 * 60 * 1000, // 45 dk
    });

    const elapsed = ((Date.now() - start) / 1000 / 60).toFixed(1);
    console.log('\n=== TATBİKAT BİTTİ ===');
    console.log('Toplam süre:', elapsed, 'dakika');
    console.log('Rapor: scrape-offline-report.txt');
    console.log('Doğrulama (isteğe bağlı): npx tsx scripts/verify-admin-after-scan.ts');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
