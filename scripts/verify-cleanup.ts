
import { prisma } from '../lib/db';

async function verify() {
    console.log('--- Verifying DB Cleanup ---');

    // Check total A101 prices
    const a101 = await prisma.market.findFirst({ where: { name: 'A101' } });
    if (!a101) return;

    const priceCount = await prisma.price.count({ where: { marketId: a101.id } });
    console.log(`Total A101 Prices: ${priceCount}`);

    // Check for "Cola Turka" (Should be gone or very few)
    const cola = await prisma.product.findMany({
        where: {
            name: { contains: 'Cola Turka' },
            prices: { some: { marketId: a101.id } }
        },
        include: { prices: true }
    });

    console.log(`Cola Turka items in DB: ${cola.length}`);
    cola.forEach(c => console.log(`- ${c.name}`));

    // Check for "GrupSpot" items if any slipped through (we can't check attribute in DB, but volume tells)
    // Previous volume was ~9000 prices. New volume should be ~4000-5000 based on Reguler ratio.
}

verify()
    .finally(() => prisma.$disconnect());
