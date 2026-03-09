import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { upsertProduct } from '../lib/db-utils.ts';
import { parseQuantity } from '../lib/utils.ts';
import * as readline from 'readline';

const prisma = new PrismaClient();

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'X-Pweb-Device-Type': 'DESKTOP'
};

// Monitor State
const state = {
    startTime: Date.now(),
    totalProducts: 0,
    markets: {
        MIGROS: 0,
        A101: 0,
        SOK: 0
    },
    errors: 0,
    lastAdded: "-",
    currentAction: "Başlatılıyor..."
};

/** Tarama bitince scrape-failed-urls.txt ve scrape-report.txt yazılacak */
const failedSokUrls: string[] = [];

function formatTime(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

const STATUS_FILE = path.join(process.cwd(), 'scrape-status.txt');

function renderUI() {
    // Clear screen
    console.clear();
    const elapsed = Date.now() - state.startTime;

    const lines = [
        '========================================================================',
        ' 🚀 MARKET KARŞILAŞTIRMA - CANLI TARAMA (localhost / dev.db)',
        '========================================================================',
        ` ⏱️  Geçen Süre    : ${formatTime(elapsed)}`,
        ` 📦 Toplam Ürün   : ${state.totalProducts} Adet`,
        ` 🏢 Marketler     : 🟠 Migros: ${state.markets.MIGROS} | 🔵 A101: ${state.markets.A101} | 🟡 Şok: ${state.markets.SOK}`,
        ` ❌ Hatalar       : ${state.errors}`,
        '------------------------------------------------------------------------',
        ` 🔄 Son Eklenen   : ${state.lastAdded}`,
        ` ⚡ İşlem         : ${state.currentAction}`,
        '========================================================================',
        '',
        '(Durdurmak için Ctrl+C tuşlarına basabilirsiniz)'
    ];
    const text = lines.join('\n');
    console.log(text);
    try { fs.writeFileSync(STATUS_FILE, text, 'utf-8'); } catch (_) { /* ignore */ }
}

async function findCategoryId(categoryPath: string, marketName: string): Promise<string | undefined> {
    const pathParts = categoryPath.split(' > ');
    const leafName = pathParts[pathParts.length - 1].trim();
    const slug = leafName.toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '')
        + `-${marketName.toLowerCase()}`;

    const cat = await prisma.category.findUnique({ where: { slug } });
    return cat?.id;
}

async function scrapeMigros(code: string, categoryName: string, categoryPath: string, market: any) {
    const dbCategoryId = await findCategoryId(categoryPath, 'Migros');


    state.currentAction = `[Migros] Taranıyor: ${categoryName}`;
    renderUI();

    const url = (page: number) => `https://www.migros.com.tr/rest/search/screens/${code}?page=${page}`;

    let page = 1;
    for (;;) {
        try {
            const res = await fetch(url(page), { headers: HEADERS });
            if (!res.ok) break;
            const json: any = await res.json();
            const items = json.data?.storeProductInfos || json.data?.searchInfo?.storeProductInfos || [];
            if (items.length === 0) break;

            const chunkSize = 50;
            for (let i = 0; i < items.length; i += chunkSize) {
                const chunk = items.slice(i, i + chunkSize);
                await Promise.all(chunk.map(async (item: any) => {
                    const price = (item.shownPrice || item.regularPrice || 0) / 100;
                    if (!item.name || price <= 0) return;

                    const qty = parseQuantity(item.name);
                    await upsertProduct({
                        name: item.name,
                        price,
                        imageUrl: item.images?.[0]?.urls?.PRODUCT_DETAIL || item.images?.[0]?.urls?.PRODUCT_LIST || '',
                        link: `https://www.migros.com.tr/${item.prettyName}`,
                        store: 'MIGROS',
                        categoryCode: code,
                        categoryName: categoryName,
                        categoryPath,
                        quantityAmount: qty.amount || undefined,
                        quantityUnit: qty.unit || undefined
                    }, market.id, dbCategoryId);

                    state.totalProducts++;
                    state.markets.MIGROS++;
                    state.lastAdded = `[MIGROS] - ${categoryName} - ${item.name.substring(0, 40)}`;
                }));
                renderUI();
            }
            page++;
        } catch (e) { state.errors++; break; }
    }
}

/** A101: Leaf id (C0512) → parent id (C05) for API. API returns data only for parent. */
function a101ParentId(leafId: string): string {
    return leafId.slice(0, 3);
}

/** A101: Parent ID + yaprak filtre. Tek istek (data=boş); API pageNumber desteklemiyor, 400 dönüyor. */
async function scrapeA101ByParent(parentId: string, leafCategories: { id: string; name: string; path: string }[], market: any) {
    const storeId = 'VS032';
    const url = `https://rio.a101.com.tr/dbmk89vnr/CALL/Store/getProductsByCategory/${storeId}?id=${parentId}&channel=SLOT&__culture=tr-TR&__platform=web&data=e30%3D&__isbase64=true`;
    const a101Headers = {
        ...HEADERS,
        Origin: 'https://www.a101.com.tr',
        Referer: 'https://www.a101.com.tr/kapida',
    };

    state.currentAction = `[A101] Taranıyor: ${parentId} (${leafCategories.length} yaprak)`;
    renderUI();

    try {
        const res = await fetch(url, { headers: a101Headers });
        if (!res.ok) {
            state.errors++;
            const body = await res.text().catch(() => '');
            console.error(`[A101] HTTP ${res.status} parent ${parentId}: ${body.slice(0, 200)}`);
            return;
        }
        const data: any = await res.json();

        let items: any[] = [];
        if (data.data && Array.isArray(data.data)) items.push(...data.data);
        if (data.children && Array.isArray(data.children)) {
            for (const child of data.children) {
                if (child.products && Array.isArray(child.products)) items.push(...child.products);
            }
        }
        const leafIds = new Set(leafCategories.map(c => c.id));
        const leafMap = Object.fromEntries(leafCategories.map(c => [c.id, c]));

        const chunkSize = 20;
        let processed = 0;
        for (const item of items) {
            const name = item.attributes?.name || item.name || '';
            const rawNormal = item.price?.normal ?? 0;
            const rawDiscounted = item.price?.discounted ?? 0;
            const normalPrice = rawNormal / 100;
            const discountedPrice = rawDiscounted / 100;
            const hasCampaign = rawDiscounted > 0 && rawDiscounted !== rawNormal;
            const price = hasCampaign ? normalPrice : (discountedPrice || normalPrice);
            if (!name || price <= 0) continue;

            const productCategoryIds: string[] = (item.categories || []).map((c: any) => c.id).filter(Boolean);
            const matchedLeafId = productCategoryIds.find((id: string) => leafIds.has(id));
            if (!matchedLeafId) continue;

            const leaf = leafMap[matchedLeafId];
            const dbCategoryId = await findCategoryId(leaf.path, 'A101');
            const qty = parseQuantity(name);
            const unwantedImg = ['yerli', 'dondurulmus', 'donuk', 'badge', 'yerliuretim', 'donukurun', 'glutensiz', 'vegan', 'helal'];
            const imgArr = item.images || [];
            const validImg = imgArr.find((im: any) => im?.url && !unwantedImg.some(kw => (im.url || '').toLowerCase().includes(kw)));
            const img = (validImg?.url || imgArr[0]?.url || '').trim();
            const link = `https://www.a101.com.tr/kapida/u/${item.url || item.id}`;

            await upsertProduct({
                name,
                price,
                campaignAmount: hasCampaign ? discountedPrice : undefined,
                campaignCondition: hasCampaign ? '10 TL ve üzeri alışverişlerinizde' : undefined,
                imageUrl: img.startsWith('http') ? img : `https://cdn2.a101.com.tr${img}`,
                link,
                store: 'A101',
                categoryCode: leaf.id,
                categoryName: leaf.name,
                categoryPath: leaf.path,
                quantityAmount: qty.amount || undefined,
                quantityUnit: qty.unit || undefined
            }, market.id, dbCategoryId);

            state.totalProducts++;
            state.markets.A101++;
            state.lastAdded = `[A101] - ${leaf.name} - ${name.substring(0, 40)}`;
            processed++;
            if (processed % chunkSize === 0) renderUI();
        }
        if (processed === 0 && items.length > 0) {
            console.warn(`[A101] parent ${parentId}: hiçbir ürün yaprak eşleşmedi (categories: ${items[0]?.categories?.map((c: any) => c.id).join(', ') || 'yok'})`);
        }
        renderUI();
    } catch (e: any) {
        state.errors++;
        console.error(`[A101] hata parent ${parentId}:`, e?.message || e);
    }
}

/** Şok sitesi "&" yerine "ve", " - " yerine tek boşluk kullanıyor. Slug buna göre üretilmeli. */
function sokSlug(name: string): string {
    let s = name.trim()
        .replace(/\s*&\s*/g, ' ve ')
        .replace(/\s+-\s+/g, ' ')
        .toLowerCase()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return s;
}

const SOK_MAX_PAGES_PER_CATEGORY = 100; // Her kategoride en fazla sayfa (pagination)

async function scrapeSok(code: string, categoryName: string, categoryPath: string, market: any, jsonUrl?: string, activeUrl?: string) {
    const dbCategoryId = await findCategoryId(categoryPath, 'Sok');
    const baseUrlBuilt = `https://www.sokmarket.com.tr/${sokSlug(categoryName)}-c-${code}`;
    const jsonBase = jsonUrl ? jsonUrl.replace(/\?.*$/, '').trim() : '';
    /** Verdiğiniz aktif Şok URL'leri (sok_active_urls.json) varsa öncelikli kullanılır. */
    let baseUrl = (activeUrl && activeUrl.startsWith('https://www.sokmarket.com.tr/') && activeUrl.includes(`-c-${code}`))
        ? activeUrl.replace(/\?.*$/, '').trim() : baseUrlBuilt;
    let page = 1;
    while (page <= SOK_MAX_PAGES_PER_CATEGORY) {
        state.currentAction = `[ŞOK] Taranıyor: ${categoryName} (sayfa ${page})`;
        renderUI();

        const url = page === 1 ? baseUrl : `${baseUrl}?page=${page}`;
        try {
            const res = await fetch(url);
            if (!res.ok) {
                if (res.status === 404 && page === 1 && jsonBase && jsonBase !== baseUrlBuilt) {
                    baseUrl = jsonBase;
                    page = 0;
                    continue;
                }
                if (res.status === 404 && page > 1) break;
                state.errors++;
                if (page === 1) {
                    console.error(`[ŞOK] HTTP ${res.status} ${categoryName} (${code}): ${url}`);
                    failedSokUrls.push(url);
                }
                break;
            }
            const html = await res.text();
            const $ = cheerio.load(html);

            const products: any[] = [];
            $('div[class*="PLPProductListing_PLPCardsWrapper"] a[href*="-p-"]').each((_, el) => {
                const href = $(el).attr('href');
                if (href) products.push({ href: href.startsWith('http') ? href : `https://www.sokmarket.com.tr${href}`, text: $(el).text().trim(), img: $(el).find('img').attr('src') || '' });
            });

            if (products.length === 0) break;

            const chunkSize = 20;
            for (let i = 0; i < products.length; i += chunkSize) {
                const chunk = products.slice(i, i + chunkSize);
                await Promise.all(chunk.map(async (p: any) => {
                    const priceRegex = /(\d{1,3}(?:[.]\d{3})*(?:,\d{1,2})?)\s*(?:₺|TL)/gi;
                    const allMatches = [...p.text.matchAll(priceRegex)];
                    if (allMatches.length === 0) return;
                    const priceMatch = allMatches[allMatches.length - 1];

                    const price = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));
                    let name = p.text;
                    for (const m of allMatches) name = name.replace(m[0], '');
                    name = name.trim();
                    if (!name || price <= 0) return;

                    const qty = parseQuantity(name);
                    await upsertProduct({
                        name,
                        price,
                        imageUrl: p.img,
                        link: p.href,
                        store: 'SOK',
                        categoryCode: code,
                        categoryName: categoryName,
                        categoryPath,
                        quantityAmount: qty.amount || undefined,
                        quantityUnit: qty.unit || undefined
                    }, market.id, dbCategoryId);

                    state.totalProducts++;
                    state.markets.SOK++;
                    state.lastAdded = `[ŞOK] - ${categoryName} - ${name.substring(0, 40)}`;
                }));
                renderUI();
            }
            page++;
            await new Promise(r => setTimeout(r, 150)); // Sayfa istekleri arası kısa bekleme
        } catch (e: any) {
            state.errors++;
            console.error(`[ŞOK] hata ${categoryName} (${code}) sayfa ${page}:`, e?.message || e);
            if (page === 1) failedSokUrls.push(baseUrl);
            break;
        }
    }
}


async function wipeDatabase() {
    state.currentAction = `Veritabanı (dev.db) temizleniyor...`;
    renderUI();

    await prisma.price.deleteMany({});
    await prisma.product.deleteMany({});
    // We don't wipe categories or markets so we don't need to re-sync them
    state.currentAction = `Veritabanı temizlendi!`;
    renderUI();
}

async function main() {
    // 1. Wipe old products/prices to start fresh
    await wipeDatabase();

    state.currentAction = `Sistem Hazırlanıyor...`;
    renderUI();

    const markets = {
        MIGROS: await prisma.market.upsert({ where: { name: 'Migros' }, update: {}, create: { name: 'Migros', url: 'https://www.migros.com.tr' } }),
        A101: await prisma.market.upsert({ where: { name: 'A101' }, update: {}, create: { name: 'A101', url: 'https://www.a101.com.tr/kapida' } }),
        SOK: await prisma.market.upsert({ where: { name: 'Şok' }, update: {}, create: { name: 'Şok', url: 'https://www.sokmarket.com.tr' } })
    };

    // Load Categories from JSON
    const migrosCats = JSON.parse(fs.readFileSync('migros_categories.json', 'utf-8')).categories;
    const a101Cats = JSON.parse(fs.readFileSync('a101_categories.json', 'utf-8')).categories;
    const sokCats = JSON.parse(fs.readFileSync('sok_categories.json', 'utf-8')).categories;
    let sokActiveUrls: Record<string, string> = {};
    try {
        const activePath = path.join(process.cwd(), 'sok_active_urls.json');
        if (fs.existsSync(activePath)) {
            const activeRaw = JSON.parse(fs.readFileSync(activePath, 'utf-8'));
            Object.keys(activeRaw).forEach(k => { if (!k.startsWith('_')) sokActiveUrls[k] = String(activeRaw[k]).replace(/\?.*$/, ''); });
        }
    } catch (_) { /* ignore */ }

    // Start UI update interval
    const uiInterval = setInterval(renderUI, 1000);

    // Sıra: A101 → Şok → Migros (localhost / dev.db)
    // A101: API parent ID ile veri döndürüyor; yaprak ID ile boş. Parent başına tek istek, ürünler categories ile yaprağa dağıtılıyor.
    const a101ByParent = new Map<string, { id: string; name: string; path: string }[]>();
    for (const cat of a101Cats) {
        const pid = a101ParentId(cat.id);
        if (!a101ByParent.has(pid)) a101ByParent.set(pid, []);
        a101ByParent.get(pid)!.push({ id: cat.id, name: cat.name, path: cat.path });
    }
    for (const [parentId, leaves] of a101ByParent) {
        await scrapeA101ByParent(parentId, leaves, markets.A101);
    }

    for (const cat of sokCats) {
        await scrapeSok(cat.id, cat.name, cat.path, markets.SOK, (cat as any).url, sokActiveUrls[String(cat.id)]);
    }

    for (const cat of migrosCats) {
        await scrapeMigros(cat.prettyName, cat.name, cat.path, markets.MIGROS);
    }

    clearInterval(uiInterval);
    state.currentAction = `✅ TÜM TARAMA İŞLEMLERİ TAMAMLANDI!`;
    renderUI();

    // Hatalı Şok URL'lerini ve ana kategori örnek sayılarını dosyaya yaz
    const failedPath = path.join(process.cwd(), 'scrape-failed-urls.txt');
    fs.writeFileSync(failedPath, failedSokUrls.length ? failedSokUrls.join('\n') : '# Bu taramada hata veren Şok URL\'si yok.\n', 'utf-8');

    const reportPath = path.join(process.cwd(), 'scrape-report.txt');
    const reportLines: string[] = [
        `Tarama bitiş: ${new Date().toISOString()}`,
        `Toplam ürün: ${state.totalProducts}, Hatalar: ${state.errors}`,
        '',
        '--- Ana kategori bazlı kaydedilen ürün sayısı (örneklem, sitedeki sayıyla karşılaştır) ---',
        ''
    ];
    for (const [marketName, marketRow] of Object.entries(markets) as [string, { id: string }][]) {
        const prices = await prisma.price.findMany({ where: { marketId: marketRow.id }, select: { productId: true } });
        const productIds = [...new Set(prices.map(p => p.productId))];
        const products = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { category: true } });
        const byCategory: Record<string, number> = {};
        for (const p of products) {
            const ana = p.category || 'Belirsiz';
            byCategory[ana] = (byCategory[ana] || 0) + 1;
        }
        reportLines.push(`${marketName}: toplam ${productIds.length} ürün`);
        const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
        for (const [cat, count] of sorted) {
            reportLines.push(`  ${cat}: ${count}`);
        }
        reportLines.push('');
    }
    reportLines.push('--- Hatalı Şok URL sayısı: ' + failedSokUrls.length + ' ---');
    fs.writeFileSync(reportPath, reportLines.join('\n'), 'utf-8');
}

main().catch(e => {
    state.errors++;
    state.currentAction = `KRİTİK HATA: ${e.message}`;
    renderUI();
}).finally(() => prisma.$disconnect());
