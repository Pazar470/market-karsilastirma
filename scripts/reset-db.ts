
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function reset() {
    console.log('🚨 STARTING FULL DATABASE RESET 🚨');
    console.log('This will delete ALL Products and Prices.');

    // Delete Prices first due to foreign key constraints
    const deletedPrices = await prisma.price.deleteMany({});
    console.log(`Deleted ${deletedPrices.count} prices.`);

    // Delete Products
    const deletedProducts = await prisma.product.deleteMany({});
    console.log(`Deleted ${deletedProducts.count} products.`);

    console.log('✅ Database is clean. Markets are preserved.');
}

reset()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
