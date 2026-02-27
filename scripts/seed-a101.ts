
import { scrapeA101 } from '../lib/scraper/a101';
import { prisma } from '../lib/db';

async function seed() {
    console.log('Starting seed...');

    // 1. Ensure Market Exists
    const marketName = 'A101';
    let market = await prisma.market.findFirst({
        where: { name: marketName },
    });

    if (!market) {
        console.log(`Creating market: ${marketName}`);
        market = await prisma.market.create({
            data: {
                name: marketName,
                website: 'https://www.a101.com.tr',
            },
        });
    } else {
        console.log(`Cleaning up existing prices for ${marketName}...`);
        const deleted = await prisma.price.deleteMany({
            where: { marketId: market.id }
        });
        console.log(`Deleted ${deleted.count} existing prices.`);
    }

    // 2. Scrape Data
    console.log('Scraping A101...');
    const products = await scrapeA101();
    console.log(`Scraped ${products.length} products.`);

    // 3. Save to DB
    for (const item of products) {
        try {
            // Find or Create Product
            // Ideally we should have a more robust matching strategy (barcode, fuzzy match)
            // For now, simple exact name match
            let product = await prisma.product.findFirst({
                where: { name: item.name },
            });

            if (!product) {
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
                // UPDATE existing product info (Category path + Units)
                await prisma.product.update({
                    where: { id: product.id },
                    data: {
                        quantityAmount: item.quantityAmount || product.quantityAmount,
                        quantityUnit: item.quantityUnit || product.quantityUnit,
                        category: item.category // Force update path
                    }
                });
                console.log(`Updated info for: ${item.name}`);
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
