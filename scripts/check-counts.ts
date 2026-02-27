
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const products = await prisma.product.count();
    const prices = await prisma.price.count();
    const migrosPrices = await prisma.price.count({
        where: {
            market: { name: 'Migros' }
        }
    });

    console.log(`Total Products: ${products}`);
    console.log(`Total Prices: ${prices}`);
    console.log(`Migros Prices: ${migrosPrices}`);
}

check().finally(() => prisma.$disconnect());
