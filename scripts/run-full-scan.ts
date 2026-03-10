/**
 * Tam tarama: Migros, A101, Sok + alarm kontrolü.
 * DATABASE_URL .env'de Supabase olmalı.
 * Çalıştırma: npx tsx scripts/run-full-scan.ts
 *
 * İzleme: Proje kökündeki scrape-status.txt dosyasını aç; her aşamada güncellenir.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { runFullScrapeBatch } from '../lib/scraper';
import { checkAlarmsAfterScrape } from '../lib/alarm-engine';
import { runSokCategoryDiscovery } from '../lib/sok-category-discovery';
import { runMigrosCategoryDiscovery } from '../lib/migros-category-discovery';
import { runA101CategoryDiscovery } from '../lib/a101-category-discovery';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const STATUS_FILE = path.join(process.cwd(), 'scrape-status.txt');

function writeStatus(lines: string[]) {
    const text = [
        '========================================================================',
        ' 🚀 TAM TARAMA (run-full-scan.ts)',
        '========================================================================',
        ...lines,
        '========================================================================',
        '',
        'Bu dosyayı kaydedip yenileyerek güncel durumu görebilirsin. Canlı log için terminale bak.'
    ].join('\n');
    try { fs.writeFileSync(STATUS_FILE, text, 'utf-8'); } catch (_) { /* ignore */ }
}

async function main() {
    const start = Date.now();
    const fmt = (ms: number) => {
        const s = Math.floor(ms / 1000);
        return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
    };

    console.log('🚀 Tam tarama başlıyor (Migros, A101, Sok)...');
    writeStatus([` ⏱️  Başlangıç: ${new Date().toLocaleTimeString('tr-TR')}`, ' 📍 Migros kategori güncelleniyor...']);
    await runMigrosCategoryDiscovery({ silent: true });
    writeStatus([` ⏱️  Başlangıç: ${new Date().toLocaleTimeString('tr-TR')}`, ' 📍 Migros kuyruğa alındı...']);
    await runFullScrapeBatch('Migros', 0);
    const pc = await prisma.product.count();
    writeStatus([` ⏱️  Geçen: ${fmt(Date.now() - start)}`, ` 📦 Ürün: ${pc}`, ' ✅ Migros bitti. A101 kategori güncelleniyor...']);
    await runA101CategoryDiscovery({ silent: true, sitemapCheck: true });
    writeStatus([` ⏱️  Geçen: ${fmt(Date.now() - start)}`, ' A101 taranıyor...']);
    await runFullScrapeBatch('A101', 0);
    const pc2 = await prisma.product.count();
    writeStatus([` ⏱️  Geçen: ${fmt(Date.now() - start)}`, ` 📦 Ürün: ${pc2}`, ' ✅ A101 bitti. Şok kategori güncelleniyor...']);

    await runSokCategoryDiscovery({ silent: true });
    writeStatus([` ⏱️  Geçen: ${fmt(Date.now() - start)}`, ' Sok taranıyor...']);
    await runFullScrapeBatch('Sok', 0);
    const pc3 = await prisma.product.count();
    writeStatus([` ⏱️  Geçen: ${fmt(Date.now() - start)}`, ` 📦 Ürün: ${pc3}`, ' ✅ Sok bitti. Alarm kontrolü...']);

    console.log('🔔 Alarm kontrolü...');
    await checkAlarmsAfterScrape();

    writeStatus([` ⏱️  Toplam süre: ${fmt(Date.now() - start)}`, ` 📦 Toplam ürün: ${pc3}`, ' ⚡ TÜM TARAMA VE ALARM KONTROLÜ TAMAMLANDI.']);
    console.log('✅ Tarama ve alarm kontrolü tamamlandı.');
}

main()
    .catch((e) => {
        console.error(e);
        writeStatus([` ❌ Hata: ${String(e?.message || e)}`]);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
