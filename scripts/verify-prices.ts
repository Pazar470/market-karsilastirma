import { prisma } from '../lib/db';
import * as cheerio from 'cheerio';
import { CATEGORIES } from '../lib/scraper/sok';

async function verifyPrices() {
    console.log('⚖️  PRICE VERIFICATION BOT STARTED');
    console.log('Select 20 random products from Şok to verify...');

    const count = await prisma.product.count({
        where: { prices: { some: { market: { name: 'Şok' } } } }
    });

    const maxSkip = Math.max(0, count - 20);
    const skip = Math.floor(Math.random() * maxSkip);

    const products = await prisma.product.findMany({
        where: { prices: { some: { market: { name: 'Şok' } } } },
        take: 20,
        skip: skip,
        include: { prices: { where: { market: { name: 'Şok' } }, take: 1, orderBy: { date: 'desc' }, include: { market: true } } }
    });

    console.log(`Checking ${products.length} products...`);
    let errors = 0;
    let verified = 0;
    let skipped = 0;

    for (const p of products) {
        if (!p.prices.length || !p.prices[0].productUrl) {
            skipped++;
            continue;
        }

        const dbPrice = Number(p.prices[0].amount);
        const url = p.prices[0].productUrl;

        // Extract Product ID and Category
        // URL format: ...-p-1234
        const productIdMatch = url.match(/-p-(\d+)$/);
        if (!productIdMatch) {
            console.log(`❌ Invalid URL format: ${url}`);
            skipped++;
            continue;
        }
        const productId = productIdMatch[1];

        // Find Category URL
        // p.category is the original Şok category string (e.g. "Meyve & Sebze")
        const sokCat = CATEGORIES.find(c => c.name === p.category);

        if (!sokCat) {
            console.warn(`⚠️  Unknown category "${p.category}" for ${p.name}. Skipping.`);
            skipped++;
            continue;
        }

        let found = false;
        let livePrice = 0;

        // Check first 3 pages
        for (let page = 1; page <= 3; page++) {
            const catUrl = `${sokCat.url}?page=${page}`;
            try {
                const res = await fetch(catUrl);
                if (!res.ok) continue;

                const html = await res.text();
                const $ = cheerio.load(html);

                // Selector: find <a> with href ending in -p-{id}
                // Need to handle relative or absolute hrefs found in cheerio
                const productLink = $(`a[href$="-p-${productId}"]`);

                if (productLink.length > 0) {
                    // Extract price using same logic as sok.ts
                    let text = '';
                    const getTextWithSpaces = (elem: any) => {
                        $(elem).contents().each((_: any, node: any) => {
                            if (node.type === 'text') {
                                text += $(node).text().trim() + ' ';
                            } else if (node.type === 'tag' && node.name !== 'script' && node.name !== 'style') {
                                getTextWithSpaces(node);
                            }
                        });
                    };
                    getTextWithSpaces(productLink);
                    text = text.replace(/\s+/g, ' ').trim();

                    const priceRegex = /(?<!\d)(\d{1,3}(?:[.]\d{3})*(?:,\d{1,2})?)\s*(?:₺|TL)/gi;
                    const matches = text.match(new RegExp(priceRegex));

                    if (matches && matches.length > 0) {
                        const priceStr = matches[matches.length - 1];
                        const cleanPrice = priceStr.toLowerCase().replace('₺', '').replace('tl', '').trim();
                        livePrice = parseFloat(cleanPrice.replace(/\./g, '').replace(',', '.'));
                        found = true;
                    }
                    break; // Found the product
                }
            } catch (e) {
                console.error(`Error checking page ${page}:`, e);
            }
        }

        if (!found) {
            console.log(`⚠️  Product not found in first 3 pages of ${sokCat.name}: ${p.name}`);
            skipped++;
        } else {
            const diff = Math.abs(livePrice - dbPrice);
            if (diff > 0.05) {
                console.error(`❌ PRICE MISMATCH: ${p.name}`);
                console.error(`   DB: ${dbPrice} TL | Live: ${livePrice} TL`);
                console.error(`   Link: ${url}`);
                errors++;
            } else {
                console.log(`✅ VERIFIED: ${p.name} (${livePrice} TL)`);
                verified++;
            }
        }

        // Polite delay
        await new Promise(r => setTimeout(r, 200));
    }


    console.log('--- VERIFICATION RESULT ---');
    console.log(`Verified: ${verified}`);
    console.log(`Errors: ${errors}`);
    if (errors === 0) {
        console.log('🎉 CONSTITUTION COMPLIANT (For tested sample)');
    } else {
        console.error('🚨 CONSTITUTION VIOLATION DETECTED');
    }
}

verifyPrices()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
