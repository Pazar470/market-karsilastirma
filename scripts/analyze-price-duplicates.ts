
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyze() {
    console.log('--- Analyzing Price vs Product Counts ---');

    const totalProducts = await prisma.product.count();
    const totalPrices = await prisma.price.count();

    console.log(`Total Unique Products: ${totalProducts}`);
    console.log(`Total Price Entries: ${totalPrices}`);
    console.log(`Ratio: ${(totalPrices / totalProducts).toFixed(2)} prices per product`);

    // Top 10 products with most price entries
    const priceCounts = await prisma.price.groupBy({
        by: ['productId', 'marketId'],
        _count: {
            id: true
        },
        orderBy: {
            _count: {
                id: 'desc'
            }
        },
        take: 10
    });

    console.log('\n--- Top 10 Products with Multiple Prices ---');
    for (const p of priceCounts) {
        const product = await prisma.product.findUnique({ where: { id: p.productId } });
        const market = await prisma.market.findUnique({ where: { id: p.marketId } });
        console.log(`Product: ${product?.name}`);
        console.log(`Market: ${market?.name}`);
        console.log(`Count: ${p._count.id} entries`);
        console.log('---');
    }
}

analyze()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
