
import { PrismaClient } from '@prisma/client';
import { scrapeSok } from '../lib/scraper/sok';

const prisma = new PrismaClient();

async function seed() {
    console.log('Starting Şok seed (Refactored)...');

    // 1. Ensure Şok Market Exists
    const marketName = 'Şok';
    const marketWebsite = 'https://www.sokmarket.com.tr';

    let market = await prisma.market.findFirst({
        where: { name: marketName },
    });

    if (!market) {
        market = await prisma.market.create({
            data: { name: marketName, website: marketWebsite }
        });
    }

    // 2. Scrape Data
    const products = await scrapeSok();
    console.log(`Scraped ${products.length} products.`);

    // 3. Upsert into DB
    for (const p of products) {
        try {
            const validName = p.name.trim();

            // Check if product exists
            let product = await prisma.product.findFirst({
                where: { name: validName }
            });

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
                // Update Image and Category Path
                await prisma.product.update({
                    where: { id: product.id },
                    data: {
                        imageUrl: p.imageUrl || product.imageUrl,
                        category: p.category // Force update path
                    }
                });
            }

            // 4. Create Price Entry
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

    console.log('Şok Seed completed.');
}

seed()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
