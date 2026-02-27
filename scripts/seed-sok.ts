
import { scrapeSok } from '../lib/scraper/sok';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
    console.log('Starting Şok seed...');

    // 1. Ensure Market Exists
    const marketName = 'Şok';
    let market = await prisma.market.findFirst({
        where: { name: marketName },
    });

    if (!market) {
        console.log(`Creating market: ${marketName}`);
        market = await prisma.market.create({
            data: {
                name: marketName,
                website: 'https://www.sokmarket.com.tr',
            },
        });
    }

    // 2. Scrape Data
    console.log('Scraping Şok...');
    const products = await scrapeSok();
    console.log(`Scraped ${products.length} products.`);

    // 3. Save to DB
    for (const item of products) {
        try {
            // Find or Create Product
            // Simple exact name match for now
            let product = await prisma.product.findFirst({
                where: { name: item.name },
            });

            if (!product) {
                // Determine category from scraped category or fallback
                // The scraped category is like "Süt & Süt Ürünleri".
                // We might want to standardize this if we have a category enum or table,
                // but currently Product.category is a string.

                product = await prisma.product.create({
                    data: {
                        name: item.name,
                        imageUrl: item.imageUrl,
                        category: item.category || 'Uncategorized',
                        quantityAmount: item.quantityAmount,
                        quantityUnit: item.quantityUnit,
                    },
                });
                console.log(`Created product: ${item.name}`);
            } else {
                console.log(`Product already exists: ${item.name} (ID: ${product.id})`);
            }

            // Create Price Entry
            // Check if price already exists for today to avoid duplicates?
            // For now, just add new price point.
            await prisma.price.create({
                data: {
                    amount: item.price,
                    currency: 'TRY',
                    marketId: market.id,
                    productId: product.id,
                    productUrl: item.link,
                },
            });
            console.log(`Added price ${item.price} for ${item.name}`);

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
