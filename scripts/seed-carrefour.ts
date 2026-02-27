
import { scrapeCarrefour } from '../lib/scraper/carrefour';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
    console.log('Starting Carrefour seed...');

    // 1. Ensure Market Exists
    const marketName = 'Carrefour';
    const marketWebsite = 'https://www.carrefoursa.com';

    let market = await prisma.market.findFirst({
        where: { name: marketName },
    });

    if (!market) {
        console.log(`Creating market: ${marketName}`);
        market = await prisma.market.create({
            data: {
                name: marketName,
                website: marketWebsite,
            },
        });
    }

    // 2. Clear Existing Data
    console.log('Cleaning up existing prices for Carrefour...');
    await prisma.price.deleteMany({
        where: { marketId: market.id }
    });
    console.log('Existing prices deleted.');

    // 3. Scrape Data
    console.log('Scraping Carrefour...');
    const productsRaw = await scrapeCarrefour();
    console.log(`Scraped ${productsRaw.length} products (Raw).`);

    // Dedup by Link
    const products = Array.from(new Map(productsRaw.map(p => [p.link, p])).values());
    console.log(`Unique products to insert: ${products.length}`);

    // 4. Save to DB
    for (const item of products) {
        try {
            // Find or Create Product
            // Simple exact name match for now.
            let product = await prisma.product.findFirst({
                where: { name: item.name },
            });

            if (!product) {
                product = await prisma.product.create({
                    data: {
                        name: item.name,
                        imageUrl: item.imageUrl,
                        // Raw category string. Mapping later.
                        category: item.category || 'Uncategorized',
                        quantityAmount: item.quantityAmount,
                        quantityUnit: item.quantityUnit,
                    },
                });
                console.log(`Created product: ${item.name}`);
            } else {
                // Update image if missing
                if (!product.imageUrl && item.imageUrl) {
                    await prisma.product.update({
                        where: { id: product.id },
                        data: { imageUrl: item.imageUrl }
                    });
                }
                console.log(`Product already exists: ${item.name} (ID: ${product.id})`);
            }

            // Create Price Entry
            await prisma.price.create({
                data: {
                    amount: item.price,
                    currency: 'TRY',
                    marketId: market.id,
                    productId: product.id,
                    productUrl: item.link,
                },
            });
            console.log(`Added price: ${item.price} TL`);

        } catch (error) {
            console.error(`Failed to save item ${item.name}:`, error);
        }
    }

    console.log('Seed completed.');
}

seed()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
