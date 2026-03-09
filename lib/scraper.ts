
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { upsertProductBatch, type ScrapedProduct } from './db-utils';
import { parseQuantity } from './utils';

const prisma = new PrismaClient();

export type ScrapeCollectResult = { products: ScrapedProduct[]; errors: { category: string; error: string }[] };

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

    if (opts?.collectOnly) return { products: allProducts, errors };
    return totalUpdated;
}

async function scrapeMigros(cat: any, market: any): Promise<ScrapedProduct[]> {
    const url = `https://www.migros.com.tr/rest/search/screens/${cat.prettyName}?page=1`;
    const res = await fetchWithTimeout(url, { headers: HEADERS });
    if (!res.ok) return [];
    const json: any = await res.json();
    const items = json.data?.storeProductInfos || json.data?.searchInfo?.storeProductInfos || [];
    const products: ScrapedProduct[] = [];
    for (const item of items) {
        const price = (item.shownPrice || item.regularPrice || 0) / 100;
        if (!item.name || price <= 0) continue;
        const qty = parseQuantity(item.name);
        products.push({
            name: item.name,
            price,
            imageUrl: item.images?.[0]?.urls?.PRODUCT_DETAIL || item.images?.[0]?.urls?.PRODUCT_LIST || '',
            link: `https://www.migros.com.tr/${item.prettyName}`,
            store: 'MIGROS',
            categoryCode: cat.prettyName,
            categoryName: cat.name,
            quantityAmount: qty.amount || undefined,
            quantityUnit: qty.unit || undefined,
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
        const name = item.attributes?.name || item.name || '';
        const price = (item.price?.discounted || item.price?.normal || 0) / 100;
        if (!name || price <= 0) continue;
        const productCatIds = (item.categories || []).map((c: any) => c.id).filter(Boolean);
        const matchedLeafId = productCatIds.find((id: string) => leafIds.has(id));
        if (!matchedLeafId) continue;
        const leaf = leafMap[matchedLeafId];
        const qty = parseQuantity(name);
        const unwantedImg = ['yerli', 'dondurulmus', 'donuk', 'badge', 'yerliuretim', 'donukurun', 'glutensiz', 'vegan', 'helal'];
        const imgArr = item.images || [];
        const validImg = imgArr.find((im: any) => im?.url && !unwantedImg.some(kw => (im.url || '').toLowerCase().includes(kw)));
        const img = (validImg?.url || imgArr[0]?.url || '').trim();
        products.push({
            name,
            price,
            imageUrl: img.startsWith('http') ? img : `https://cdn2.a101.com.tr${img}`,
            link: `https://www.a101.com.tr/kapida/u/${item.url || item.id}`,
            store: 'A101',
            categoryCode: leaf.id,
            categoryName: leaf.name,
            quantityAmount: qty.amount || undefined,
            quantityUnit: qty.unit || undefined,
        });
    }
    return products;
}

function sokCategorySlug(name: string): string {
    return (name || '').trim().toLowerCase()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const SOK_MAX_PAGES_PER_CATEGORY = 200;

async function scrapeSok(cat: any, market: any): Promise<ScrapedProduct[]> {
    const baseUrl = `https://www.sokmarket.com.tr/${sokCategorySlug(cat.name)}-c-${cat.id}`;
    const products: ScrapedProduct[] = [];
    let page = 1;

    while (page <= SOK_MAX_PAGES_PER_CATEGORY) {
        const url = page === 1 ? baseUrl : `${baseUrl}?page=${page}`;
        const res = await fetchWithTimeout(url);
        if (!res.ok) break;
        const html = await res.text();
        const $ = cheerio.load(html);
        const elements = $('div[class*="PLPProductListing_PLPCardsWrapper"] a[href*="-p-"]').toArray();
        if (elements.length === 0) break;

        for (const el of elements) {
            const text = $(el).text().trim();
            const priceMatch = text.match(/(\d{1,3}(?:[.]\d{3})*(?:,\d{1,2})?)\s*(?:₺|TL)/i);
            if (!priceMatch) continue;
            const price = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));
            const name = text.replace(priceMatch[0], '').trim();
            const qty = parseQuantity(name);
            products.push({
                name,
                price,
                imageUrl: $(el).find('img').attr('src') || '',
                link: `https://www.sokmarket.com.tr${($(el).attr('href') || '').startsWith('/') ? '' : '/'}${$(el).attr('href') || ''}`,
                store: 'SOK',
                categoryCode: cat.id,
                categoryName: cat.name,
                quantityAmount: qty.amount || undefined,
                quantityUnit: qty.unit || undefined,
            });
        }
        page++;
        if (page <= SOK_MAX_PAGES_PER_CATEGORY) await new Promise((r) => setTimeout(r, 200));
    }

    return products;
}
