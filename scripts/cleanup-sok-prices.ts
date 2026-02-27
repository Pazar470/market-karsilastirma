
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupSokPrices() {
    try {
        console.log('Starting cleanup of erroneous Şok prices...');

        // 1. Delete prices > 5000 TL (Safety threshold for supermarket items)
        // Adjust threshold if needed, but 5000 is safe for groceries.
        // The specific bug was ~42000.
        const threshold = 5000;

        const deleted = await prisma.price.deleteMany({
            where: {
                amount: { gt: threshold },
                market: { name: 'Şok' }
            }
        });

        console.log(`Deleted ${deleted.count} price entries greater than ${threshold} TL.`);

        // 2. Optional: Remove products that have NO prices left after cleanup
        // This keeps the DB clean of "ghost" products
        const productsWithoutPrices = await prisma.product.findMany({
            where: {
                prices: { none: {} }
            }
        });

        if (productsWithoutPrices.length > 0) {
            console.log(`Found ${productsWithoutPrices.length} products with no prices. Deleting...`);
            const deletedProducts = await prisma.product.deleteMany({
                where: {
                    prices: { none: {} }
                }
            });
            console.log(`Deleted ${deletedProducts.count} orphan products.`);
        }

    } catch (error) {
        console.error('Cleanup error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanupSokPrices();
