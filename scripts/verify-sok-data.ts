
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verify() {
    // Fetch 20 random Şok products/prices
    const prices = await prisma.price.findMany({
        where: {
            market: { name: 'Şok' }
        },
        include: {
            product: true
        },
        take: 20,
        orderBy: {
            date: 'desc'
        }
    });

    console.log(`Verifying ${prices.length} recent Şok items...`);
    console.log('-'.repeat(50));

    for (const p of prices) {
        console.log(`Product: ${p.product.name}`);
        console.log(`Price: ${p.amount} ${p.currency}`);
        console.log(`Category (Raw): ${p.product.category}`);
        console.log(`Unit: ${p.product.quantityAmount} ${p.product.quantityUnit}`);
        console.log(`URL: ${p.productUrl}`);
        console.log('-'.repeat(20));
    }
}

verify().finally(() => prisma.$disconnect());
