import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';
import { getMappedCategory } from '../lib/category-mapper.ts';

const prisma = new PrismaClient();

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'X-Pweb-Device-Type': 'DESKTOP'
};

const TARGET_SLUG = 'kasar-peyniri-c-40d';
const TARGET_ID = 20000000001037;

interface MigrosProduct {
    name: string;
    prettyName: string;
    shownPrice: number;
    regularPrice: number;
    images: { urls: { PRODUCT_DETAIL: string; PRODUCT_LIST: string } }[];
    category: { name: string };
}

function parseQuantity(name: string): { amount: number | null, unit: string | null } {
    const lowerName = name.toLowerCase();

    // Pattern for numbers followed by optional unit
    const regex = /(\d+([.,]\d+)?)\s*(kg|g|gr|l|ml|mlt|ad|adet)?\b/i;
    const match = lowerName.match(regex);

    if (match) {
        let amount = parseFloat(match[1].replace(',', '.'));
        let unit = match[3] ? match[3].toLowerCase() : null;

        // RULE: If no unit is specified but number is > 10, assume Grams
        // BUT check for counting suffixes like "li", "lu", "dilim" to avoid (e.g. "Kürdan 50'li")
        if (!unit && amount > 10) {
            const matchIndex = match.index || 0;
            const matchLength = match[0].length;
            const textAfter = lowerName.slice(matchIndex + matchLength).trim();
            const countSuffixes = ['li', 'lu', 'lü', 'lı', "'li", "'lu", "'lü", "'lı", "-li", "-lu", "-lü", "-lı", "dilim", "adet"];

            const isCount = countSuffixes.some(s => textAfter.startsWith(s));
            if (isCount) {
                return { amount: null, unit: null };
            }
            unit = 'g';
        }

        if (unit === 'g' || unit === 'gr') {
            amount = amount / 1000;
            unit = 'kg';
        } else if (unit === 'ml' || unit === 'mlt') {
            amount = amount / 1000;
            unit = 'l';
        }
        return { amount, unit };
    }

    // Handle standalone "Kg"
    if (lowerName.endsWith(' kg')) {
        return { amount: 1, unit: 'kg' };
    }

    return { amount: null, unit: null };
}

async function scrapeAndSave() {
    console.log(`Starting Strict Fetch for: ${TARGET_SLUG}`);

    // 1. Ensure Migros Market Exists
    const marketName = 'Migros';
    let market = await prisma.market.findFirst({ where: { name: marketName } });
    if (!market) {
        console.log('Creating Migros market...');
        market = await prisma.market.create({
            data: { name: marketName, website: 'https://www.migros.com.tr' }
        });
    }

    // 2. Fetch Loop
    let page = 1;
    let hasMore = true;
    let totalSaved = 0;

    while (hasMore) {
        const url = `https://www.migros.com.tr/rest/search/screens/${TARGET_SLUG}?page=${page}&reid=123456789`;
        console.log(`  Fetching page ${page}...`);

        try {
            const res = await fetch(url, { headers: HEADERS });
            if (!res.ok) {
                console.error(`  Failed: ${res.status}`);
                break;
            }

            const json: any = await res.json();
            const items: MigrosProduct[] = json.data?.searchInfo?.storeProductInfos || [];

            if (items.length === 0) {
                console.log('  No more items found.');
                hasMore = false;
                break;
            }

            console.log(`  Found ${items.length} items. Processing...`);

            for (const item of items) {
                const priceVal = item.shownPrice || item.regularPrice || 0;
                const price = priceVal / 100; // Cents to TL
                const img = item.images?.[0]?.urls?.PRODUCT_DETAIL || item.images?.[0]?.urls?.PRODUCT_LIST || '';
                const unitInfo = parseQuantity(item.name);
                const link = `https://www.migros.com.tr/${item.prettyName}`;

                // Database Ops
                const validName = item.name.trim();

                // 2a. Find/Create Product
                let product = await prisma.product.findFirst({ where: { name: validName } });

                const mappedCat = getMappedCategory('MIGROS', TARGET_SLUG, item.category?.name || 'Kaşar Peyniri');
                const finalCategory = mappedCat.master;
                const tagsJson = JSON.stringify(mappedCat.tags);

                if (!product) {
                    product = await prisma.product.create({
                        data: {
                            name: validName,
                            imageUrl: img,
                            category: finalCategory,
                            quantityAmount: unitInfo?.amount,
                            quantityUnit: unitInfo?.unit,
                            isSuspicious: false,
                            tags: tagsJson
                        }
                    });
                } else {
                    // Update category and quantity if needed
                    product = await prisma.product.update({
                        where: { id: product.id },
                        data: {
                            category: finalCategory,
                            quantityAmount: unitInfo?.amount,
                            quantityUnit: unitInfo?.unit,
                            isSuspicious: false,
                            tags: tagsJson,
                            updatedAt: new Date()
                        }
                    });
                }

                // 2b. Add Price
                await prisma.price.create({
                    data: {
                        amount: price,
                        currency: 'TRY',
                        marketId: market.id,
                        productId: product.id,
                        productUrl: link
                    }
                });

                totalSaved++;
                // console.log(`    + Saved: ${validName} (${price} TL)`);
            }

            page++;
            await new Promise(r => setTimeout(r, 500)); // Polite delay

        } catch (e) {
            console.error('  Error fetching page:', e);
            hasMore = false;
        }
    }

    console.log(`\nDone! Total products saved: ${totalSaved}`);
}

scrapeAndSave()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
