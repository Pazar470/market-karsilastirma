/**
 * Tam tarama: Önce tüm veriyi indir (Supabase'e yazmadan), sonra toplu upload.
 * İndirme ve upload hataları ayrı ayrı raporlanır.
 * İzleme: Tarama sırasında /tarama sayfasından scrape-status.json ile canlı izlenir.
 *
 * Çalıştırma: npx tsx scripts/run-full-scan-offline.ts
 * Rapor: scrape-offline-report.txt (indirme + upload hataları)
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { runFullScrapeBatch, type ScrapeCollectResult } from '../lib/scraper';
import { upsertProductBatch } from '../lib/db-utils';
import { checkAlarmsAfterScrape } from '../lib/alarm-engine';
import { syncMappingToNullProducts } from '../lib/category-sync';
import { runSokCategoryDiscovery } from '../lib/sok-category-discovery';
import { runMigrosCategoryDiscovery } from '../lib/migros-category-discovery';
import { runA101CategoryDiscovery } from '../lib/a101-category-discovery';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const REPORT_FILE = path.join(process.cwd(), 'scrape-offline-report.txt');
const STATUS_FILE = path.join(process.cwd(), 'scrape-status.txt');
const STATUS_JSON = path.join(process.cwd(), 'scrape-status.json');

export type TaramaStatus = {
    phase: 'idle' | 'indirme' | 'yukleme' | 'alarm' | 'bitti' | 'hata';
    currentMarket: string | null;
    currentCategory: string | null;
    markets: Record<string, { urunSayisi: number; hataSayisi: number }>;
    toplamUrun: number;
    toplamHata: number;
    message: string;
    lastUpdated: string;
    startedAt: string | null;
    finishedAt: string | null;
};

function writeStatus(lines: string[]) {
    const text = ['=== OFFLINE TARAMA ===', new Date().toISOString(), '', ...lines].join('\n');
    try {
        fs.writeFileSync(STATUS_FILE, text, 'utf-8');
    } catch (_) {
        /* ignore */
    }
}

function writeStatusJson(status: TaramaStatus) {
    try {
        fs.writeFileSync(STATUS_JSON, JSON.stringify(status, null, 2), 'utf-8');
    } catch (_) {
        /* ignore */
    }
}

function writeReport(s: string) {
    try {
        fs.appendFileSync(REPORT_FILE, s, 'utf-8');
    } catch (_) {
        /* ignore */
    }
}

async function main() {
    const start = Date.now();
    if (fs.existsSync(REPORT_FILE)) fs.unlinkSync(REPORT_FILE);
    writeReport(`Offline tarama raporu — ${new Date().toISOString()}\n${'='.repeat(60)}\n\n`);

    const markets = await prisma.market.findMany({
        where: { name: { in: ['Migros', 'A101', 'Sok', 'Şok'] } },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
    });
    if (markets.length === 0) {
        throw new Error('Migros, A101 veya Şok market bulunamadı.');
    }

    const status: TaramaStatus = {
        phase: 'indirme',
        currentMarket: null,
        currentCategory: null,
        markets: {},
        toplamUrun: 0,
        toplamHata: 0,
        message: 'İndirme başlıyor…',
        lastUpdated: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        finishedAt: null,
    };
    writeStatusJson(status);

    // —— 1. Sadece indirme (DB'ye yazma yok) ——
    writeStatus(['Aşama 1: İndirme başlıyor (Supabase yok)...']);
    const collected: { marketName: string; marketId: string; products: ScrapeCollectResult['products']; errors: ScrapeCollectResult['errors'] }[] = [];
    const downloadErrors: { market: string; category: string; error: string }[] = [];

    for (const market of markets) {
        status.currentMarket = market.name;
        status.currentCategory = null;
        status.markets[market.name] = { urunSayisi: 0, hataSayisi: 0 };
        status.message = `${market.name} taranıyor…`;
        status.lastUpdated = new Date().toISOString();
        writeStatusJson(status);

        if (market.name === 'Migros') {
            status.message = 'Migros kategori listesi güncelleniyor…';
            status.lastUpdated = new Date().toISOString();
            writeStatusJson(status);
            console.log('\n📂 Migros: Kategori keşfi (rest/categories → yaprak liste)...');
            const migrosResult = await runMigrosCategoryDiscovery({ silent: true });
            console.log(`   migros_categories.json güncellendi (${migrosResult.leafCount} yaprak).`);
        }
        if (market.name === 'A101') {
            status.message = 'A101 kategori listesi güncelleniyor…';
            status.lastUpdated = new Date().toISOString();
            writeStatusJson(status);
            console.log('\n📂 A101: Kategori keşfi (15 ana kategori → yaprak liste + sitemap uyarısı)...');
            const a101Result = await runA101CategoryDiscovery({ silent: true, sitemapCheck: true });
            console.log(`   a101_categories.json güncellendi (${a101Result.leafCount} yaprak).`);
        }
        if (market.name === 'Sok' || market.name === 'Şok') {
            status.message = 'Şok kategori listesi güncelleniyor…';
            status.lastUpdated = new Date().toISOString();
            writeStatusJson(status);
            console.log('\n📂 Şok: Kategori keşfi (19 ana kategori → sok_categories.json)…');
            writeStatus(['Şok kategori keşfi...']);
            await runSokCategoryDiscovery({ silent: true });
            console.log('   sok_categories.json güncellendi.');
        }

        console.log(`\n📥 İndirme: ${market.name}`);
        writeStatus([`İndiriliyor: ${market.name}...`]);

        const result = await runFullScrapeBatch(market.name, 0, {
            collectOnly: true,
            onProgress(e) {
                status.currentCategory = e.category;
                status.markets[e.market].urunSayisi += e.productsInCategory;
                if (e.error) status.markets[e.market].hataSayisi += 1;
                status.toplamUrun = Object.values(status.markets).reduce((s, m) => s + m.urunSayisi, 0);
                status.toplamHata = Object.values(status.markets).reduce((s, m) => s + m.hataSayisi, 0);
                status.lastUpdated = new Date().toISOString();
                writeStatusJson(status);
            },
        });
        if (typeof result === 'number') throw new Error('Beklenmeyen cevap: collectOnly true olmalı.');
        status.markets[market.name] = { urunSayisi: result.products.length, hataSayisi: result.errors.length };
        status.toplamUrun = Object.values(status.markets).reduce((s, m) => s + m.urunSayisi, 0);
        status.toplamHata = Object.values(status.markets).reduce((s, m) => s + m.hataSayisi, 0);
        status.lastUpdated = new Date().toISOString();
        writeStatusJson(status);

        collected.push({
            marketName: market.name,
            marketId: market.id,
            products: result.products,
            errors: result.errors,
        });
        result.errors.forEach((e) => downloadErrors.push({ market: market.name, category: e.category, error: e.error }));
        console.log(`   → ${market.name}: ${result.products.length} ürün indirildi, ${result.errors.length} kategori hatası`);
        writeReport(`  ${market.name}: ${result.products.length} ürün, ${result.errors.length} kategori hatası\n`);
    }

    const totalProducts = collected.reduce((s, c) => s + c.products.length, 0);
    const sokCollected = collected.find((c) => c.marketName === 'Sok' || c.marketName === 'Şok');
    writeReport(`İNDİRME ÖZET\n${'-'.repeat(40)}\n`);
    writeReport(`Toplam ürün (tüm marketler): ${totalProducts}\n`);
    writeReport(`Şok getirdiği ürün sayısı: ${sokCollected ? sokCollected.products.length : 0}\n`);
    writeReport(`İndirme hatası (kategori): ${downloadErrors.length}\n\n`);
    if (downloadErrors.length > 0) {
        writeReport(`İNDİRME HATALARI\n${'-'.repeat(40)}\n`);
        downloadErrors.forEach((e) => writeReport(`  [${e.market}] ${e.category}: ${e.error}\n`));
        writeReport('\n');
    }

    // —— 2. Toplu upload Supabase'e ——
    status.phase = 'yukleme';
    status.currentMarket = null;
    status.currentCategory = null;
    status.message = "Supabase'e toplu yazılıyor…";
    status.lastUpdated = new Date().toISOString();
    writeStatusJson(status);

    writeStatus(['Aşama 2: Supabase\'e toplu yazma...']);
    const uploadErrors: { market: string; error: string }[] = [];
    const createdPerMarket: Record<string, number> = {};
    const uploadedPerMarket: Record<string, number> = {};

    for (const { marketName, marketId, products } of collected) {
        if (products.length === 0) {
            console.log(`\n📤 Upload: ${marketName} — atlandı (0 ürün)`);
            continue;
        }
        status.currentMarket = marketName;
        status.message = `${marketName} yükleniyor (${products.length} ürün)…`;
        status.lastUpdated = new Date().toISOString();
        writeStatusJson(status);
        try {
            const { created } = await upsertProductBatch(products, marketId, marketName);
            createdPerMarket[marketName] = created;
            uploadedPerMarket[marketName] = products.length;
            console.log(`\n📤 Upload: ${marketName} — ${products.length} ürün Supabase'e yazıldı (bu turda ${created} yeni ürün oluşturuldu)`);
            writeStatus([`Yükleniyor: ${marketName} (${products.length}, ${created} yeni)...`]);
        } catch (err) {
            const msg = String(err instanceof Error ? err.message : err);
            uploadErrors.push({ market: marketName, error: msg });
            console.error(`Upload hatası ${marketName}:`, err);
        }
    }

    writeReport(`UPLOAD ÖZET\n${'-'.repeat(40)}\n`);
    for (const [m, count] of Object.entries(uploadedPerMarket)) {
        writeReport(`  ${m}: ${count} ürün yazıldı, ${createdPerMarket[m] ?? 0} yeni\n`);
    }
    writeReport(`Upload hatası: ${uploadErrors.length}\n\n`);
    if (uploadErrors.length > 0) {
        writeReport(`UPLOAD HATALARI\n${'-'.repeat(40)}\n`);
        uploadErrors.forEach((e) => writeReport(`  [${e.market}] ${e.error}\n`));
        writeReport('\n');
    }

    // —— 2b. Mapping senkronu (otomatik; ODS her taramada okunmaz) ——
    const nullBeforeMapping = await prisma.product.count({ where: { categoryId: null } });
    status.phase = 'yukleme';
    status.message = 'Mapping senkronu…';
    status.lastUpdated = new Date().toISOString();
    writeStatusJson(status);
    writeStatus(['Mapping senkronu...']);
    console.log(`\n🔄 Mapping senkronu öncesi categoryId=null: ${nullBeforeMapping} ürün`);
    const mappingUpdated = await syncMappingToNullProducts(prisma);
    console.log(`   Mapping ile güncellenen: ${mappingUpdated} ürün`);

    const nullCount = await prisma.product.count({ where: { categoryId: null } });
    console.log(`   Mapping sonrası categoryId=null (admin'e düşen): ${nullCount} ürün`);
    writeReport(`Mapping senkronu\n${'-'.repeat(40)}\n`);
    writeReport(`  Öncesi categoryId=null: ${nullBeforeMapping}\n`);
    writeReport(`  Mapping ile güncellenen: ${mappingUpdated}\n`);
    writeReport(`  Sonrası categoryId=null (admin'de onay bekleyen): ${nullCount}\n\n`);
    writeReport(`ADMİN / KATEGORİ DURUMU\n${'-'.repeat(40)}\n`);
    writeReport(`Admin'e düşen (categoryId=null): ${nullCount} ürün\n`);
    writeReport(`Bu turda yeni eklenen (market bazında): ${JSON.stringify(createdPerMarket, null, 0)}\n\n`);

    // —— 3. Alarm kontrolü ——
    if (uploadErrors.length === 0) {
        status.phase = 'alarm';
        status.currentMarket = null;
        status.message = 'Alarm kontrolü yapılıyor…';
        status.lastUpdated = new Date().toISOString();
        writeStatusJson(status);
        console.log('\n🔔 Alarm kontrolü...');
        writeStatus(['Alarm kontrolü...']);
        await checkAlarmsAfterScrape();
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    status.phase = uploadErrors.length > 0 ? 'hata' : 'bitti';
    status.currentMarket = null;
    status.currentCategory = null;
    status.message = uploadErrors.length > 0
        ? `Tamamlandı (upload hataları: ${uploadErrors.length}). Toplam ${totalProducts} ürün.`
        : `Tarama bitti. Toplam ${totalProducts} ürün, ${elapsed} sn.`;
    status.finishedAt = new Date().toISOString();
    status.lastUpdated = status.finishedAt;
    writeStatusJson(status);

    // —— Detaylı son özet (konsol + rapor) ——
    const summaryLines = [
        '',
        '═══════════════════════════════════════════════════════════',
        '  TARAMA DETAYLI SONUÇ',
        '═══════════════════════════════════════════════════════════',
        '',
        '  İNDİRME (market bazında):',
        ...collected.map((c) => `    ${c.marketName}: ${c.products.length} ürün, ${c.errors.length} kategori hatası`),
        `    TOPLAM: ${totalProducts} ürün, ${downloadErrors.length} indirme hatası`,
        '',
        '  ŞOK:',
        `    Getirilen ürün: ${sokCollected ? sokCollected.products.length : 0}`,
        '',
        '  SUPABASE UPLOAD:',
        ...Object.entries(uploadedPerMarket).map(([m, n]) => `    ${m}: ${n} ürün yazıldı (${createdPerMarket[m] ?? 0} yeni)`),
        `    Upload hatası: ${uploadErrors.length} market`,
        '',
        '  MAPPING SENKRONU:',
        `    Öncesi categoryId=null: ${nullBeforeMapping}`,
        `    Güncellenen: ${mappingUpdated}`,
        `    Sonrası categoryId=null: ${nullCount}`,
        '',
        '  ADMİN:',
        `    Onay bekleyen (categoryId=null): ${nullCount} ürün`,
        '',
        `  SÜRE: ${elapsed} sn`,
        `  RAPOR DOSYASI: ${REPORT_FILE}`,
        '═══════════════════════════════════════════════════════════',
        '',
    ];
    const summaryText = summaryLines.join('\n');
    console.log(summaryText);
    writeReport(`\n${'='.repeat(60)}\nTARAMA DETAYLI SONUÇ\n${'='.repeat(60)}\n`);
    writeReport(summaryLines.filter((l) => l.trim()).join('\n') + '\n\n');
    writeReport(`Toplam süre: ${elapsed} sn\n`);
    writeStatus([`Bitti. Ürün: ${totalProducts}`, `İndirme hataları: ${downloadErrors.length}`, `Upload hataları: ${uploadErrors.length}`]);
    console.log(`\n✅ Offline tarama bitti. Rapor: ${REPORT_FILE}`);
}

main()
    .catch((e) => {
        console.error(e);
        writeStatus([`Hata: ${String(e?.message || e)}`]);
        writeReport(`\nHATA: ${String(e?.message || e)}\n`);
        try {
            const errStatus: TaramaStatus = {
                phase: 'hata',
                currentMarket: null,
                currentCategory: null,
                markets: {},
                toplamUrun: 0,
                toplamHata: 0,
                message: String(e?.message || e),
                lastUpdated: new Date().toISOString(),
                startedAt: null,
                finishedAt: new Date().toISOString(),
            };
            fs.writeFileSync(STATUS_JSON, JSON.stringify(errStatus, null, 2), 'utf-8');
        } catch (_) {}
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
