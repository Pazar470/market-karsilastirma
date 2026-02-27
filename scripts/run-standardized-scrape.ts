import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { CATEGORY_MAP } from '../lib/category-mapper.ts';
import { upsertProduct } from '../lib/db-utils.ts';
import { parseQuantity } from '../lib/utils.ts';

const prisma = new PrismaClient();

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'X-Pweb-Device-Type': 'DESKTOP'
};

/**
 * Finds the DB Category ID based on path and market name (slug logic from sync script)
 */
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
    const mapping = CATEGORY_MAP.MIGROS?.[code];
    const masterName = mapping?.master || categoryName;

    console.log(`  [Migros] Scrapping: ${masterName} (${code})...`);
    const url = (page: number) => `https://www.migros.com.tr/rest/search/screens/${code}?page=${page}`;

    let page = 1;
    let count = 0;
    while (page <= 2) { // Limit to 2 pages for "all categories" batch to keep it fast
        try {
            const res = await fetch(url(page), { headers: HEADERS });
            if (!res.ok) break;
            const json: any = await res.json();
            const items = json.data?.storeProductInfos || json.data?.searchInfo?.storeProductInfos || [];
            if (items.length === 0) break;

            for (const item of items) {
                const price = (item.shownPrice || item.regularPrice || 0) / 100;
                if (!item.name || price <= 0) continue;

                const qty = parseQuantity(item.name);
                await upsertProduct({
                    name: item.name,
                    price,
                    imageUrl: item.images?.[0]?.urls?.PRODUCT_LIST || '',
                    link: `https://www.migros.com.tr/${item.prettyName}`,
                    store: 'MIGROS',
                    categoryCode: code,
                    categoryName: masterName,
                    quantityAmount: qty.amount || undefined,
                    quantityUnit: qty.unit || undefined
                }, market.id, dbCategoryId);
                count++;
            }
            page++;
        } catch (e) { break; }
    }
}

async function scrapeA101(code: string, categoryName: string, categoryPath: string, market: any) {
    const dbCategoryId = await findCategoryId(categoryPath, 'A101');
    const mapping = CATEGORY_MAP.A101?.[code];
    const masterName = mapping?.master || categoryName;

    console.log(`  [A101] Scrapping: ${masterName} (${code})...`);
    const storeId = 'VS032';
    const url = `https://rio.a101.com.tr/dbmk89vnr/CALL/Store/getProductsByCategory/${storeId}?id=${code}&channel=SLOT&__culture=tr-TR&__platform=web&data=e30%3D&__isbase64=true`;

    try {
        const res = await fetch(url, { headers: HEADERS });
        if (!res.ok) return;
        const data: any = await res.json();

        let items: any[] = [];
        if (data.data) items.push(...data.data);
        if (data.children) {
            for (const child of data.children) {
                if (child.products) items.push(...child.products);
            }
        }

        for (const item of items) {
            const rawPrice = item.price?.discounted || item.price?.normal || 0;
            const price = rawPrice / 100;
            if (!item.name || price <= 0) continue;

            const qty = parseQuantity(item.name);
            const img = item.images?.[0]?.url || '';
            const link = `https://www.a101.com.tr/kapida/u/${item.url || item.id}`;

            await upsertProduct({
                name: item.name,
                price,
                imageUrl: img.startsWith('http') ? img : `https://cdn2.a101.com.tr${img}`,
                link,
                store: 'A101',
                categoryCode: code,
                categoryName: masterName,
                quantityAmount: qty.amount || undefined,
                quantityUnit: qty.unit || undefined
            }, market.id, dbCategoryId);
        }
    } catch (e: any) { }
}

async function scrapeSok(code: string, categoryName: string, categoryPath: string, market: any) {
    const dbCategoryId = await findCategoryId(categoryPath, 'Sok');
    const mapping = CATEGORY_MAP.SOK?.[code];
    const masterName = mapping?.master || categoryName;

    console.log(`  [Şok] Scrapping: ${masterName} (${code})...`);
    const url = `https://www.sokmarket.com.tr/${code}`;

    try {
        const res = await fetch(url);
        if (!res.ok) return;
        const html = await res.text();
        const $ = cheerio.load(html);

        const products: any[] = [];
        $('div[class*="PLPProductListing_PLPCardsWrapper"] a[href*="-p-"]').each((_, el) => {
            const href = $(el).attr('href');
            if (href) products.push({ href: `https://www.sokmarket.com.tr${href}`, text: $(el).text().trim(), img: $(el).find('img').attr('src') || '' });
        });

        for (const p of products) {
            const priceMatch = p.text.match(/(\d{1,3}(?:[.]\d{3})*(?:,\d{1,2})?)\s*(?:₺|TL)/i);
            if (!priceMatch) continue;

            const price = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));
            const name = p.text.replace(priceMatch[0], '').trim();
            if (!name || price <= 0) continue;

            const qty = parseQuantity(name);
            await upsertProduct({
                name,
                price,
                imageUrl: p.img,
                link: p.href,
                store: 'SOK',
                categoryCode: code,
                categoryName: masterName,
                quantityAmount: qty.amount || undefined,
                quantityUnit: qty.unit || undefined
            }, market.id, dbCategoryId);
        }
    } catch (e) { }
}

async function main() {
    console.log('🚀 MVP Mode: Fetching ALL Categories...');

    const markets = {
        MIGROS: await prisma.market.upsert({ where: { name: 'Migros' }, update: {}, create: { name: 'Migros', url: 'https://www.migros.com.tr' } }),
        A101: await prisma.market.upsert({ where: { name: 'A101' }, update: {}, create: { name: 'A101', url: 'https://www.a101.com.tr' } }),
        SOK: await prisma.market.upsert({ where: { name: 'Şok' }, update: {}, create: { name: 'Şok', url: 'https://www.sokmarket.com.tr' } })
    };

    // Load Categories from JSON
    const migrosCats = JSON.parse(fs.readFileSync('migros_categories.json', 'utf-8')).categories;
    const a101Cats = JSON.parse(fs.readFileSync('a101_categories.json', 'utf-8'));
    const sokCats = JSON.parse(fs.readFileSync('sok_categories.json', 'utf-8'));

    // Process a limited sample or all? User wants ALL. 
    // We will do all but limit pages to keep it viable for a first test.

    console.log('\n--- MIGROS (Partial Sample for Speed) ---');
    for (const cat of migrosCats.slice(0, 50)) { // Testing first 50
        await scrapeMigros(cat.prettyName, cat.name, cat.path, markets.MIGROS);
    }

    console.log('\n--- A101 (Partial Sample for Speed) ---');
    for (const cat of a101Cats.slice(0, 50)) {
        await scrapeA101(cat.id, cat.name, cat.path, markets.A101);
    }

    console.log('\n--- SOK (Partial Sample for Speed) ---');
    for (const cat of sokCats.slice(0, 30)) {
        await scrapeSok(cat.id, cat.name, cat.path, markets.SOK);
    }

    console.log('\n✅ Scrape Cycle Finished.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
