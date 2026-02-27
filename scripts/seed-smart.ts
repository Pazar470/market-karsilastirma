
import { PrismaClient } from '@prisma/client';
import { scrapeMigrosAPI, getProductsByCategory } from '../lib/scraper/migros-api';
// import { scrapeSok } from '../lib/scraper/sok'; 
import { isProductValid } from '../lib/product-sanity-check';

const prisma = new PrismaClient();

// Helper to construct a Mock Leaf object for Migros Scraper
function createMockLeaf(name: string, prettyName: string) {
    return {
        id: 0,
        name: name,
        prettyName: prettyName,
        path: name, // Added path
        children: []
    };
}

async function smartSeed() {
    // Ensure market exists
    let market = await prisma.market.findFirst({ where: { name: 'Migros' } });
    if (!market) {
        market = await prisma.market.create({ data: { name: 'Migros', website: 'migros.com.tr' } });
    }

    // FULL THROTTLE MODE: ONLY PEYNIR, NO LIMITS
    const targets = [
        // { name: 'Domates Salçası', slug: 'konserve-c-452', filter: 'salça' }, 
        // { name: 'Bebek Bezi', slug: 'bebek-bezi-c-ab' },
        // { name: 'Süt', slug: 'sut-c-6c' },
        { name: 'Peynir', slug: 'peynir-c-6d' },
        // { name: 'Zeytin', slug: 'zeytin-c-71' },
        // { name: 'Makarna', slug: 'makarnalar-c-425' },
        // { name: 'Çamaşır Deterjanı', slug: 'camasir-yikama-c-86' },
        // { name: 'Çay', slug: 'cay-c-475' }
    ];

    console.log('Cleaning DB (Full Peynir Run - No Sanity)...');
    await prisma.price.deleteMany({});
    await prisma.product.deleteMany({});

    for (const target of targets) {
        console.log(`\nFetching ALL: ${target.name}...`);
        const leaf = createMockLeaf(target.name, target.slug);
        const products = await getProductsByCategory(leaf);
        console.log(`  Fetched total ${products.length} items from API.`);

        // NO LIMIT
        let savedCount = 0;
        let skippedCount = 0;

        for (const p of products) {
            // 1. Target Filter (if any)
            // if (target.filter && !p.name.toLowerCase().includes(target.filter)) continue;

            // 2. Global Sanity Check - DISABLED
            /* 
            if (!isProductValid(p.name, p.category || target.name, p.price)) {
                console.log(`Skipped (Sanity): ${p.name}`);
                skippedCount++;
                continue;
            }
            */

            await prisma.product.create({
                data: {
                    name: p.name,
                    imageUrl: p.imageUrl,
                    category: target.name, // Canonical Name
                    quantityAmount: p.quantityAmount,
                    quantityUnit: p.quantityUnit,
                    prices: {
                        create: {
                            amount: p.price,
                            marketId: market.id,
                            productUrl: p.link
                        }
                    }
                }
            });
            savedCount++;
        }
        console.log(`Done with ${target.name}. Saved: ${savedCount}, Rejected: ${skippedCount}.`);
    }
}

smartSeed();
