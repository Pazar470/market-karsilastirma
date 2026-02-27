
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { upsertProduct } from './db-utils';
import { parseQuantity } from './utils';

const prisma = new PrismaClient();

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'X-Pweb-Device-Type': 'DESKTOP'
};

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

export async function runFullScrapeBatch(marketName: string, batchSize: number = 20) {
    console.log(`🚀 Starting Full Scrape Batch for ${marketName}...`);

    const market = await prisma.market.findFirst({ where: { name: marketName } });
    if (!market) throw new Error(`Market ${marketName} not found`);

    // Load category file
    const fileName = `${marketName.toLowerCase()}_categories.json`;
    const filePath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) throw new Error(`Category file ${fileName} not found`);

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const categories = data.categories || data;

    // We can use a cursor or random sampling per cron run, 
    // or just run all if we are on a powerful machine.
    // For Vercel, we will likely need to call this API multiple times 
    // or use a loop with small batches.

    let totalUpdated = 0;

    for (const cat of categories.slice(0, batchSize)) { // For testing, using first 20
        try {
            if (marketName === 'Migros') {
                await scrapeMigros(cat, market);
            } else if (marketName === 'A101') {
                await scrapeA101(cat, market);
            } else if (marketName === 'Sok') {
                await scrapeSok(cat, market);
            }
            totalUpdated++;
        } catch (err) {
            console.error(`Error scraping ${cat.name}:`, err);
        }
    }

    return totalUpdated;
}

async function scrapeMigros(cat: any, market: any) {
    const dbId = await findCategoryId(cat.path, 'Migros');
    const url = `https://www.migros.com.tr/rest/search/screens/${cat.prettyName}?page=1`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return;
    const json: any = await res.json();
    const items = json.data?.storeProductInfos || json.data?.searchInfo?.storeProductInfos || [];

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
            categoryCode: cat.prettyName,
            categoryName: cat.name,
            quantityAmount: qty.amount || undefined,
            quantityUnit: qty.unit || undefined
        }, market.id, dbId);
    }
}

async function scrapeA101(cat: any, market: any) {
    const dbId = await findCategoryId(cat.path, 'A101');
    const url = `https://rio.a101.com.tr/dbmk89vnr/CALL/Store/getProductsByCategory/VS032?id=${cat.id}&channel=SLOT&__culture=tr-TR&__platform=web&data=e30%3D&__isbase64=true`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return;
    const data: any = await res.json();
    const items = [...(data.data || []), ...(data.children?.flatMap((c: any) => c.products || []) || [])];

    for (const item of items) {
        const price = (item.price?.discounted || item.price?.normal || 0) / 100;
        if (!item.name || price <= 0) continue;
        const qty = parseQuantity(item.name);
        const img = item.images?.[0]?.url || '';
        await upsertProduct({
            name: item.name,
            price,
            imageUrl: img.startsWith('http') ? img : `https://cdn2.a101.com.tr${img}`,
            link: `https://www.a101.com.tr/kapida/u/${item.url || item.id}`,
            store: 'A101',
            categoryCode: cat.id,
            categoryName: cat.name,
            quantityAmount: qty.amount || undefined,
            quantityUnit: qty.unit || undefined
        }, market.id, dbId);
    }
}

async function scrapeSok(cat: any, market: any) {
    const dbId = await findCategoryId(cat.path, 'Sok');
    const url = `https://www.sokmarket.com.tr/${cat.id}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const html = await res.text();
    const $ = cheerio.load(html);

    const elements = $('div[class*="PLPProductListing_PLPCardsWrapper"] a[href*="-p-"]').toArray();

    for (const el of elements) {
        const text = $(el).text().trim();
        const priceMatch = text.match(/(\d{1,3}(?:[.]\d{3})*(?:,\d{1,2})?)\s*(?:₺|TL)/i);
        if (!priceMatch) continue;
        const price = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));
        const name = text.replace(priceMatch[0], '').trim();
        const qty = parseQuantity(name);
        await upsertProduct({
            name,
            price,
            imageUrl: $(el).find('img').attr('src') || '',
            link: `https://www.sokmarket.com.tr${$(el).attr('href')}`,
            store: 'SOK',
            categoryCode: cat.id,
            categoryName: cat.name,
            quantityAmount: qty.amount || undefined,
            quantityUnit: qty.unit || undefined
        }, market.id, dbId);
    }
}
