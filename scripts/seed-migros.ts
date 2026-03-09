
import { scrapeMigros } from '../lib/scraper/migros';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
    console.log('Starting Migros seed...');

    // 1. Ensure Market Exists
    const marketName = 'Migros';
    const marketWebsite = 'https://www.migros.com.tr';

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

    // 2. Scrape Data
    console.log('Scraping Migros...');
    // scrapeMigros iterates over configured queries
    const products = await scrapeMigros();
    console.log(`Scraped ${products.length} products.`);

    // 3. Save to DB
    for (const item of products) {
        try {
            // Find or Create Product
            // Simple exact name match for now. In future we might use barcodes or normalized names.
            let product = await prisma.product.findFirst({
                where: { name: item.name },
            });

            if (!product) {
                product = await prisma.product.create({
                    data: {
                        name: item.name,
                        imageUrl: item.imageUrl,
                        // Store the raw category string for now. Mapping to Master Category ID happens later.
                        category: item.category || 'Uncategorized',
                        quantityAmount: item.quantityAmount,
                        quantityUnit: item.quantityUnit,
                    },
                });
                console.log(`Created product: ${item.name}`);
            } else {
                // Determine if we update existing product info?
                // For now, let's keep it simple and just update price.
                // But if image is missing, we could update it.
                if (!product.imageUrl && item.imageUrl) {
                    await prisma.product.update({
                        where: { id: product.id },
                        data: { imageUrl: item.imageUrl }
                    });
                }
                console.log(`Product already exists: ${item.name} (ID: ${product.id})`);
            }

            // Create Price Entry
            // TODO: Avoid duplicate price entries for same day/hour?
            // For now, we just append history.
            await prisma.price.create({
                data: {
                    amount: item.price,
                    currency: 'TRY', // Migros returns TRY
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
