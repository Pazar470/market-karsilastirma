
import { PrismaClient } from '@prisma/client';
import { scrapeMigrosAPI } from '../lib/scraper/migros-api';

const prisma = new PrismaClient();

async function seed() {
    console.log('Starting Migros seed (API Version)...');

    // 1. Ensure Migros Market Exists
    const marketName = 'Migros';
    const marketWebsite = 'https://www.migros.com.tr';

    let market = await prisma.market.findFirst({
        where: { name: marketName },
    });

    if (!market) {
        market = await prisma.market.create({
            data: { name: marketName, website: marketWebsite }
        });
    }

    // 3. Scrape & Upsert in Batches
    const products = await scrapeMigrosAPI(async (batch) => {
        console.log(`  > Saving batch of ${batch.length} products...`);
        for (const p of batch) {
            try {
                const validName = p.name.trim();

                // Find or Create Product
                let product = await prisma.product.findFirst({ where: { name: validName } });

                if (!product) {
                    product = await prisma.product.create({
                        data: {
                            name: validName,
                            imageUrl: p.imageUrl,
                            category: p.category,
                            quantityAmount: p.quantityAmount,
                            quantityUnit: p.quantityUnit
                        }
                    });
                } else {
                    // Update image and CATEGORY (Critical for Bridge Strategy)
                    await prisma.product.update({
                        where: { id: product.id },
                        data: {
                            imageUrl: p.imageUrl || product.imageUrl,
                            category: p.category // Force update path
                        }
                    });
                }

                // Create Price
                await prisma.price.create({
                    data: {
                        marketId: market.id,
                        productId: product.id,
                        amount: p.price,
                        currency: 'TRY',
                        productUrl: p.link
                    }
                });

            } catch (e) {
                console.error(`Error saving ${p.name}:`, e);
            }
        }
    });

    console.log(`Scraped TOTAL ${products.length} products.`);

    console.log('Seed completed.');
}

seed()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
