
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { upsertProductBatch, type ScrapedProduct } from './db-utils';
import { parseQuantity } from './utils';

const prisma = new PrismaClient();

export type ScrapeCollectResult = { products: ScrapedProduct[]; errors: { category: string; error: string }[] };

// Diagnostik mod: SCRAPE_DEBUG=1 iken ham market verisini küçük bir örneklem olarak dosyaya yazarız.
const SCRAPE_DEBUG_ENABLED = process.env.SCRAPE_DEBUG === '1';
const SCRAPE_DEBUG_LIMIT = Number(process.env.SCRAPE_DEBUG_LIMIT ?? '2000');

type DebugItem = { market: string; category: any; raw: any };

const debugMigrosRaw: DebugItem[] = [];
const debugA101Raw: DebugItem[] = [];
const debugSokRaw: DebugItem[] = [];

function pushDebugRaw(target: DebugItem[], market: string, category: any, raw: any) {
    if (!SCRAPE_DEBUG_ENABLED) return;
    if (target.length >= SCRAPE_DEBUG_LIMIT) return;
    try {
        target.push({ market, category, raw });
    } catch {
        // Ham obje serileştirme hatası oluşursa sessizce yut
    }
}

function writeDebugRawIfAny(marketName: string) {
    if (!SCRAPE_DEBUG_ENABLED) return;
    const baseDir = path.join(process.cwd(), 'debug-scrape');
    try {
        if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    } catch {
        return;
    }
    const map: Record<string, DebugItem[]> = {
        Migros: debugMigrosRaw,
        MIGROS: debugMigrosRaw,
        A101: debugA101Raw,
        Sok: debugSokRaw,
        Şok: debugSokRaw,
        SOK: debugSokRaw,
    };
    const data = map[marketName];
    if (!data || data.length === 0) return;
    const fileSafe = marketName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const filePath = path.join(baseDir, `${fileSafe}-raw.json`);
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
        // Yazma hatası önemli değil; taramayı bozmasın
    }
}

export type ScrapeProgressEvent = { market: string; category: string; productsInCategory: number; error?: string };

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'X-Pweb-Device-Type': 'DESKTOP'
};

const FETCH_TIMEOUT_MS = 25000;

function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

export async function runFullScrapeBatch(
    marketName: string,
    batchSize: number = 0,
    opts?: { collectOnly?: boolean; onProgress?: (e: ScrapeProgressEvent) => void }
): Promise<number | ScrapeCollectResult> {
    console.log(`🚀 Starting Full Scrape Batch for ${marketName}${opts?.collectOnly ? ' (sadece indirme, DB yok)' : ''}...`);

    const market = await prisma.market.findFirst({ where: { name: marketName } });
    if (!market) throw new Error(`Market ${marketName} not found`);

    const fileName = `${marketName.toLowerCase().replace('ş', 's')}_categories.json`;
    const filePath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) throw new Error(`Category file ${fileName} not found`);

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const categories = data.categories || data;
    const toProcess = batchSize > 0 ? categories.slice(0, batchSize) : categories;
    const total = toProcess.length;
    console.log(`   ${marketName}: ${total} kategori işlenecek.`);

    const allProducts: ScrapedProduct[] = [];
    const errors: { category: string; error: string }[] = [];
    let totalUpdated = 0;
    const report = (category: string, productsInCategory: number, error?: string) => {
        opts?.onProgress?.({ market: marketName, category, productsInCategory, error });
    };

    if (marketName === 'A101') {
        const byParent = new Map<string, any[]>();
        for (const cat of toProcess) {
            const parentId = cat.id.slice(0, 3);
            if (!byParent.has(parentId)) byParent.set(parentId, []);
            byParent.get(parentId)!.push(cat);
        }
        for (const [parentId, leaves] of byParent) {
            try {
                const products = await scrapeA101ByParent(parentId, leaves, market);
                report(`A101 parent ${parentId}`, products.length);
                if (opts?.collectOnly) allProducts.push(...products);
                else if (products.length > 0) await upsertProductBatch(products, market.id, market.name);
                totalUpdated += opts?.collectOnly ? products.length : leaves.length;
            } catch (err) {
                const msg = String(err instanceof Error ? err.message : err);
                errors.push({ category: `A101 parent ${parentId}`, error: msg });
                report(`A101 parent ${parentId}`, 0, msg);
                console.error(`Error scraping A101 parent ${parentId}:`, err);
            }
        }
    } else {
        let idx = 0;
        for (const cat of toProcess) {
            idx++;
            const label = cat.name || cat.prettyName || cat.id || String(idx);
            try {
                console.log(`   [${marketName}] ${idx}/${total} ${label}`);
                let products: ScrapedProduct[] = [];
                if (marketName === 'Migros') products = await scrapeMigros(cat, market);
                else if (marketName === 'Sok' || marketName === 'Şok') products = await scrapeSok(cat, market);
                report(label, products.length);
                if (opts?.collectOnly) allProducts.push(...products);
                else if (products.length > 0) await upsertProductBatch(products, market.id, market.name);
                totalUpdated += opts?.collectOnly ? products.length : 1;
            } catch (err) {
                const msg = String(err instanceof Error ? err.message : err);
                errors.push({ category: label, error: msg });
                report(label, 0, msg);
                console.error(`Error scraping ${label}:`, err);
            }
        }
    }

    // Diagnostik mod: İlgili market için ham item örneklerini yaz
    if (opts?.collectOnly) {
        writeDebugRawIfAny(marketName);
        return { products: allProducts, errors };
    }

    writeDebugRawIfAny(marketName);
    return totalUpdated;
}

/**
 * Keşif amaçlı: Migros için sadece ham JSON'u toplar, DB'ye hiçbir şey yazmaz.
 * SCRAPE_DEBUG=1 ise debug-scrape/migros-raw.json dosyasına örnekler düşer.
 * maxCategories ile kaç kategoriden örnek alınacağını sınırlayabilirsiniz.
 */
export async function runMigrosDebugDiscovery(maxCategories: number = 5): Promise<void> {
    const fileName = 'migros_categories.json';
    const filePath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) throw new Error(`Category file ${fileName} not found`);

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const categories = (data.categories || data) as any[];
    const toProcess = categories.slice(0, Math.max(1, maxCategories));

    console.log(`🔍 Migros debug discovery: ${toProcess.length} kategori işlenecek.`);
    const fakeMarket = { name: 'Migros' } as any;

    for (let i = 0; i < toProcess.length; i++) {
        const cat = toProcess[i];
        const label = cat.name || cat.prettyName || cat.id || String(i + 1);
        console.log(`   [Migros] ${i + 1}/${toProcess.length} ${label}`);
        try {
            await scrapeMigros(cat, fakeMarket);
        } catch (err) {
            console.error(`   ❌ Migros debug kategorisi hata: ${label}`, err);
        }
    }

    // SCRAPE_DEBUG=1 ise burada toplanan ham item'lar debug-scrape/migros-raw.json'a yazılır
    writeDebugRawIfAny('Migros');
    console.log('✅ Migros debug discovery bitti (ham JSON için debug-scrape klasörüne bakın).');
}

async function scrapeMigros(cat: any, market: any): Promise<ScrapedProduct[]> {
    const url = `https://www.migros.com.tr/rest/search/screens/${cat.prettyName}?page=1`;
    const res = await fetchWithTimeout(url, { headers: HEADERS });
    if (!res.ok) return [];
    const json: any = await res.json();
    const items = json.data?.storeProductInfos || json.data?.searchInfo?.storeProductInfos || [];
    const products: ScrapedProduct[] = [];
    for (const item of items) {
        pushDebugRaw(debugMigrosRaw, market.name ?? 'Migros', cat, item);
        const shown = Number(item.shownPrice || 0);
        const regular = Number(item.regularPrice || 0);
        const baseCents = regular || shown || 0;
        const campaignCents = shown > 0 && regular > 0 && shown < regular ? shown : 0;
        const listPrice = baseCents / 100;
        const campaignPrice = campaignCents > 0 ? campaignCents / 100 : undefined;
        if (!item.name || listPrice <= 0) continue;

        // Migros bize hazır unit/unitAmount veriyor — önce onları kullan, yoksa isimden parse.
        const unitAmount = Number(item.unitAmount || 0) || undefined;
        const unitCode: string | undefined = item.unit || undefined;
        let quantityAmount: number | undefined;
        let quantityUnit: string | undefined;
        if (unitCode != null && unitCode !== '') {
            const u = String(unitCode).toUpperCase();
            quantityUnit = u === 'PIECE' ? 'adet' : u === 'KG' ? 'kg' : (u === 'L' || u === 'LT' || u === 'LITER') ? 'l' : u.toLowerCase();
            quantityAmount = unitAmount ?? undefined;
        }
        if (quantityAmount == null || quantityUnit == null) {
            const qtyFromName = parseQuantity(item.name);
            if (quantityAmount == null) quantityAmount = qtyFromName.amount || undefined;
            if (quantityUnit == null) quantityUnit = qtyFromName.unit || undefined;
        }

        // Kategori ağacından market kategori yolu üret (Süt & Kahvaltılık > Beyaz Peynir > İnek Peyniri vb.)
        const pathParts: string[] = [];
        if (Array.isArray(item.categoryAscendants)) {
            for (const asc of item.categoryAscendants) {
                if (asc?.name) pathParts.push(String(asc.name));
            }
        }
        if (item.category?.name) pathParts.push(String(item.category.name));
        const categoryPath = pathParts.length > 0 ? pathParts.join(' > ') : undefined;

        // Kampanya koşulu: CRM etiketi veya indirim oranından üretilmiş kısa metin
        let campaignCondition: string | undefined;
        const tag = Array.isArray(item.crmDiscountTags) && item.crmDiscountTags[0]?.tag;
        if (tag && typeof tag === 'string' && tag.trim() !== '') {
            campaignCondition = tag.trim();
        } else if (typeof item.discountRate === 'number' && item.discountRate > 0) {
            campaignCondition = `%${item.discountRate} indirim`;
        }

        products.push({
            name: item.name,
            price: listPrice,
            imageUrl: item.images?.[0]?.urls?.PRODUCT_DETAIL || item.images?.[0]?.urls?.PRODUCT_LIST || '',
            link: `https://www.migros.com.tr/${item.prettyName}`,
            store: 'MIGROS',
            categoryCode: cat.prettyName,
            categoryName: cat.name,
            categoryPath,
            quantityAmount,
            quantityUnit,
            campaignAmount: campaignPrice,
            campaignCondition,
        });
    }
    return products;
}

const A101_HEADERS = {
    ...HEADERS,
    Origin: 'https://www.a101.com.tr',
    Referer: 'https://www.a101.com.tr/kapida',
};

/** A101: Parent ID ile tek istek atar; ürünleri product.categories ile yaprak kategorilere dağıtır. */
async function scrapeA101ByParent(parentId: string, leafCategories: { id: string; name: string; path: string }[], market: any): Promise<ScrapedProduct[]> {
    const url = `https://rio.a101.com.tr/dbmk89vnr/CALL/Store/getProductsByCategory/VS032?id=${parentId}&channel=SLOT&__culture=tr-TR&__platform=web&data=e30%3D&__isbase64=true`;
    const res = await fetchWithTimeout(url, { headers: A101_HEADERS });
    if (!res.ok) return [];
    const data: any = await res.json();
    const items = [...(data.data || []), ...(data.children?.flatMap((c: any) => c.products || []) || [])];
    const leafIds = new Set(leafCategories.map((c: any) => c.id));
    const leafMap = Object.fromEntries(leafCategories.map((c: any) => [c.id, c]));
    const products: ScrapedProduct[] = [];
    for (const item of items) {
        pushDebugRaw(debugA101Raw, market.name ?? 'A101', { parentId, leafCategories }, item);
        const name = item.attributes?.name || item.name || '';
        const normalCents = Number(item.price?.normal || 0);
        const discountedCents = Number(item.price?.discounted || 0);
        const baseCents = normalCents || discountedCents || 0;
        const hasCampaign = discountedCents > 0 && discountedCents < baseCents;
        const listPrice = baseCents / 100;
        const campaignPrice = hasCampaign ? discountedCents / 100 : undefined;
        const campaignText: string | undefined = hasCampaign ? (item.price?.discountRateStr || undefined) : undefined;
        if (!name || listPrice <= 0) continue;
        const productCatIds = (item.categories || []).map((c: any) => c.id).filter(Boolean);
        const matchedLeafId = productCatIds.find((id: string) => leafIds.has(id));
        if (!matchedLeafId) continue;
        const leaf = leafMap[matchedLeafId];

        // A101 bize netWeight + salesUnitOfMeasure veriyor — önce onları kullan (30 cm, inç vb. isimden çıkmaz).
        const attrs = item.attributes || {};
        const netWeight = attrs.netWeight != null ? Number(attrs.netWeight) : NaN;
        const salesUnit = (attrs.salesUnitOfMeasure || attrs.baseUnitOfMeasure || '').toString().toUpperCase().trim();
        let quantityAmount: number | undefined;
        let quantityUnit: string | undefined;
        if (salesUnit && !Number.isNaN(netWeight) && netWeight >= 0) {
            if (salesUnit === 'KG') {
                quantityUnit = 'kg';
                quantityAmount = netWeight >= 1000 ? netWeight / 1000 : netWeight; // A101 gram gönderiyor → kg
            } else if (salesUnit === 'ML') {
                quantityUnit = 'l';
                quantityAmount = netWeight / 1000;
            } else if (salesUnit === 'L' || salesUnit === 'LT' || salesUnit === 'LITER') {
                quantityUnit = 'l';
                quantityAmount = netWeight >= 1000 ? netWeight / 1000 : netWeight;
            } else if (salesUnit === 'ADT' || salesUnit === 'PIECE' || salesUnit === 'ADET') {
                quantityUnit = 'adet';
                quantityAmount = netWeight > 0 ? netWeight : 1;
            } else {
                quantityUnit = salesUnit.toLowerCase();
                quantityAmount = netWeight;
            }
        }
        if (quantityAmount == null || quantityUnit == null) {
            const qty = parseQuantity(name);
            if (quantityAmount == null) quantityAmount = qty.amount || undefined;
            if (quantityUnit == null) quantityUnit = qty.unit || undefined;
        }

        const unwantedImg = ['yerli', 'dondurulmus', 'donuk', 'badge', 'yerliuretim', 'donukurun', 'glutensiz', 'vegan', 'helal'];
        const imgArr = item.images || [];
        const validImg = imgArr.find((im: any) => im?.url && !unwantedImg.some(kw => (im.url || '').toLowerCase().includes(kw)));
        const img = (validImg?.url || imgArr[0]?.url || '').trim();
        products.push({
            name,
            price: listPrice,
            imageUrl: img.startsWith('http') ? img : `https://cdn2.a101.com.tr${img}`,
            link: `https://www.a101.com.tr/kapida/u/${item.url || item.id}`,
            store: 'A101',
            categoryCode: leaf.id,
            categoryName: leaf.name,
            quantityAmount,
            quantityUnit,
            campaignAmount: campaignPrice,
            campaignCondition: campaignText,
        });
    }
    return products;
}

function sokCategorySlug(name: string): string {
    return (name || '').trim().toLowerCase()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/** Şok __NEXT_DATA__ içinde ürün dizisini bulur (rekürsif arama). */
function findProductsInNextData(obj: any, depth = 0): any[] {
    if (depth > 12) return [];
    if (Array.isArray(obj) && obj.length > 0) {
        const first = obj[0];
        if (first && typeof first === 'object') {
            const name = first.name ?? first.productName ?? first.title;
            const price = first.price ?? first.shownPrice ?? first.salePrice ?? first.listPrice;
            if (name && typeof name === 'string' && price != null && Number(price) > 0) return obj;
        }
    }
    if (obj && typeof obj === 'object')
        for (const k of Object.keys(obj)) {
            const found = findProductsInNextData(obj[k], depth + 1);
            if (found.length > 0) return found;
        }
    return [];
}

/** Şok: __NEXT_DATA__ veya HTML'den ürün çıkarır. */
function parseSokProductsFromHtml(html: string, $: ReturnType<typeof cheerio.load>, cat: any): ScrapedProduct[] {
    const out: ScrapedProduct[] = [];
    const seen = new Set<string>();

    // 1) __NEXT_DATA__ dene
    const nextMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (nextMatch) {
        try {
            const data = JSON.parse(nextMatch[1]);
            // Keşif amaçlı: tüm NEXT_DATA objesini debug'a da düşür (SCRAPE_DEBUG=1 iken).
            pushDebugRaw(debugSokRaw, 'SOK', cat, data);

            const list = findProductsInNextData(data);
            for (const p of list) {
                pushDebugRaw(debugSokRaw, 'SOK', cat, p);
                const name = p.name ?? p.productName ?? p.title ?? '';
                const priceVal = p.price ?? p.shownPrice ?? p.salePrice ?? p.listPrice;
                const price = typeof priceVal === 'number' ? priceVal : parseFloat(String(priceVal).replace(/\./g, '').replace(',', '.')) || 0;
                const href = p.slug ?? p.url ?? p.link ?? (p.id ? `p-${p.id}` : '');
                const link = href && !href.startsWith('http')
                    ? `https://www.sokmarket.com.tr/${href.startsWith('/') ? href.slice(1) : href}`
                    : (href || '');
                const img = p.imageUrl ?? p.image ?? p.images?.[0]?.url ?? '';
                if (!name || price <= 0) continue;
                const key = `${name}|${price}`;
                if (seen.has(key)) continue;
                seen.add(key);
                const qty = parseQuantity(name);
                if (!link) continue;
                out.push({
                    name,
                    price,
                    imageUrl: typeof img === 'string' ? img : '',
                    link,
                    store: 'SOK',
                    categoryCode: cat.id,
                    categoryName: cat.name,
                    quantityAmount: qty.amount || undefined,
                    quantityUnit: qty.unit || undefined,
                });
            }
            if (out.length > 0) return out;
        } catch (_) { /* ignore */ }
    }

    // 2) HTML: önce eski selector, yoksa tüm ürün linkleri
    let elements = $('div[class*="PLPProductListing_PLPCardsWrapper"] a[href*="-p-"]').toArray();
    if (elements.length === 0) elements = $('a[href*="-p-"]').toArray();

    for (const el of elements) {
        const $el = $(el);
        const href = $el.attr('href') || '';
        if (!href || !href.includes('-p-')) continue;
        // Ürün adı ve fiyat bazen link içinde, bazen parent/üst div'de; birkaç kaynaktan dene
        const candidates = [
            $el.closest('div[class*="Card"], article, [class*="product"], [class*="Product"]').first().text().trim(),
            $el.parent().parent().text().trim(),
            $el.parent().text().trim(),
            $el.text().trim(),
        ].filter(Boolean);
        let text = candidates[0] || '';
        for (const t of candidates) {
            if (t.length >= 10 && t.length <= 500 && /\d[\d.,]*\s*(?:₺|TL)/i.test(t)) {
                text = t;
                break;
            }
        }
        if (!text) text = candidates.join(' ');
        const priceMatch = text.match(/(\d{1,3}(?:[.]\d{3})*(?:,\d{1,2})?)\s*(?:₺|TL)/i);
        if (!priceMatch) continue;
        const price = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));
        if (price <= 0) continue;
        let name = text.replace(priceMatch[0], '').replace(/\s+/g, ' ').trim();
        // Gürültü kelimeleri kes (Filtreleme, Marka, Sepete Ekle vb.)
        name = name.replace(/\b(?:Filtreleme|Marka|Temizle|Sepete Ekle|Kampanyalı|Önerilen)\b/gi, '').replace(/\s+/g, ' ').trim();
        if (!name || name.length < 2) name = href.replace(/.*\/([^/]+)-p-\d+$/, '$1').replace(/-/g, ' ') || 'Ürün';
        const key = `${name}|${price}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const qty = parseQuantity(name);
        out.push({
            name,
            price,
            imageUrl: $el.find('img').attr('src') || '',
            link: `https://www.sokmarket.com.tr${href.startsWith('/') ? href : '/' + href}`,
            store: 'SOK',
            categoryCode: cat.id,
            categoryName: cat.name,
            quantityAmount: qty.amount || undefined,
            quantityUnit: qty.unit || undefined,
        });
    }
    return out;
}

const SOK_MAX_PAGES_PER_CATEGORY = 200;
/** Boş sayfa geldiğinde kaç kez yeniden denenecek (sayfa 2+ için gecikmeli yanıt olabiliyor). */
const SOK_EMPTY_PAGE_RETRIES = 2;
/** Arka arkaya kaç boş sayfa gelirse pagination kesilsin (tek boşta hemen kesmeyelim). */
const SOK_CONSECUTIVE_EMPTY_BEFORE_STOP = 2;

async function scrapeSok(cat: any, market: any): Promise<ScrapedProduct[]> {
    let baseUrl = cat.url && typeof cat.url === 'string' && cat.url.includes('sokmarket.com.tr')
        ? cat.url.replace(/\?.*$/, '').replace(/(sokmarket\.com\.tr)\/+/, '$1/')
        : `https://www.sokmarket.com.tr/${sokCategorySlug(cat.name)}-c-${cat.id}`;
    const products: ScrapedProduct[] = [];
    let page = 1;
    let consecutiveEmpty = 0;

    while (page <= SOK_MAX_PAGES_PER_CATEGORY) {
        const url = page === 1 ? baseUrl : `${baseUrl}?page=${page}`;
        const res = await fetchWithTimeout(url, { headers: HEADERS });
        if (!res.ok) break;
        let html = await res.text();
        let $ = cheerio.load(html);
        let pageProducts = parseSokProductsFromHtml(html, $, cat);
        // Sayfa 2+ bazen gecikmeli/boş dönebiliyor; birkaç kez yeniden dene
        if (page > 1 && pageProducts.length === 0) {
            for (let r = 0; r < SOK_EMPTY_PAGE_RETRIES; r++) {
                await new Promise((x) => setTimeout(x, 800 + r * 500));
                const retryRes = await fetchWithTimeout(url, { headers: HEADERS });
                if (retryRes.ok) {
                    html = await retryRes.text();
                    $ = cheerio.load(html);
                    pageProducts = parseSokProductsFromHtml(html, $, cat);
                    if (pageProducts.length > 0) break;
                }
            }
        }
        if (pageProducts.length === 0) {
            consecutiveEmpty++;
            if (consecutiveEmpty >= SOK_CONSECUTIVE_EMPTY_BEFORE_STOP) break;
            page++;
            await new Promise((r) => setTimeout(r, 200));
            continue;
        }
        consecutiveEmpty = 0;
        products.push(...pageProducts);
        page++;
        if (page <= SOK_MAX_PAGES_PER_CATEGORY) await new Promise((r) => setTimeout(r, 200));
    }

    return products;
}

/**
 * Şok için: Birkaç kategoriden ürün linki toplayıp tekil ürün detay sayfalarına istek atar.
 * Amaç sadece keşif — SCRAPE_DEBUG=1 iken debug-scrape/sok-raw.json içine product detail JSON'u düşürmek.
 * DB'ye hiçbir şey yazmaz.
 */
export async function runSokProductDetailDebug(maxCategories: number = 2, maxProductsPerCategory: number = 5): Promise<void> {
    const fileName = 'sok_categories.json';
    const filePath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) throw new Error(`Category file ${fileName} not found`);

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const categories = (data.categories || data) as any[];
    const toProcess = categories.slice(0, Math.max(1, maxCategories));

    console.log(`🔍 Şok ürün detay debug: ${toProcess.length} kategori, her birinden en fazla ${maxProductsPerCategory} ürün.`);

    const productLinks: string[] = [];

    for (let i = 0; i < toProcess.length; i++) {
        const cat = toProcess[i];
        const label = cat.name || cat.id || String(i + 1);
        console.log(`   [Şok] Kategori sayfası: ${label}`);
        try {
            let baseUrl = cat.url && typeof cat.url === 'string' && cat.url.includes('sokmarket.com.tr')
                ? cat.url.replace(/\?.*$/, '').replace(/(sokmarket\.com\.tr)\/+/, '$1/')
                : `https://www.sokmarket.com.tr/${sokCategorySlug(cat.name)}-c-${cat.id}`;
            const url = baseUrl;
            const res = await fetchWithTimeout(url, { headers: HEADERS });
            if (!res.ok) continue;
            const html = await res.text();
            const $ = cheerio.load(html);
            let elements = $('a[href*="-p-"]').toArray();
            for (const el of elements) {
                if (productLinks.length >= maxCategories * maxProductsPerCategory) break;
                const href = $(el).attr('href') || '';
                if (!href || !href.includes('-p-')) continue;
                const full = href.startsWith('http') ? href : `https://www.sokmarket.com.tr${href.startsWith('/') ? href : '/' + href}`;
                if (!productLinks.includes(full)) productLinks.push(full);
                if (productLinks.length >= maxCategories * maxProductsPerCategory) break;
            }
        } catch (err) {
            console.error(`   ❌ Şok kategori debug hata: ${label}`, err);
        }
    }

    console.log(`   [Şok] Toplam ürün linki: ${productLinks.length}`);

    for (const link of productLinks) {
        console.log(`   [Şok] Ürün detay: ${link}`);
        try {
            const res = await fetchWithTimeout(link, { headers: HEADERS });
            if (!res.ok) continue;
            const html = await res.text();
            const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
            if (!match) continue;
            const data = JSON.parse(match[1]);
            // Ürün detay JSON'unu ham olarak debug'a at
            pushDebugRaw(debugSokRaw, 'SOK_DETAIL', { link }, data);
        } catch (err) {
            console.error(`   ❌ Şok ürün detay hata: ${link}`, err);
        }
    }

    writeDebugRawIfAny('Sok');
    console.log('✅ Şok ürün detay debug bitti (ham JSON için debug-scrape/sok-raw.json\'a bakın).');
}

/**
 * Keşif amaçlı: Şok için sadece ham JSON/ürün objelerini toplar, DB'ye hiçbir şey yazmaz.
 * SCRAPE_DEBUG=1 ise debug-scrape/sok-raw.json dosyasına örnekler düşer.
 * maxCategories ile kaç kategoriden örnek alınacağını sınırlayabilirsiniz.
 */
export async function runSokDebugDiscovery(maxCategories: number = 5): Promise<void> {
    const fileName = 'sok_categories.json';
    const filePath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) throw new Error(`Category file ${fileName} not found`);

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const categories = (data.categories || data) as any[];
    const toProcess = categories.slice(0, Math.max(1, maxCategories));

    console.log(`🔍 Şok debug discovery: ${toProcess.length} kategori işlenecek.`);
    const fakeMarket = { name: 'Sok' } as any;

    for (let i = 0; i < toProcess.length; i++) {
        const cat = toProcess[i];
        const label = cat.name || cat.id || String(i + 1);
        console.log(`   [Şok] ${i + 1}/${toProcess.length} ${label}`);
        try {
            await scrapeSok(cat, fakeMarket);
        } catch (err) {
            console.error(`   ❌ Şok debug kategorisi hata: ${label}`, err);
        }
    }

    // SCRAPE_DEBUG=1 ise burada toplanan ham item'lar debug-scrape/sok-raw.json'a yazılır
    writeDebugRawIfAny('Sok');
    console.log('✅ Şok debug discovery bitti (ham JSON için debug-scrape klasörüne bakın).');
}
