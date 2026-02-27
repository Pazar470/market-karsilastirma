
import { prisma } from '../lib/db';

async function check() {
    console.log('--- Market Data Distribution ---');
    const markets = await prisma.market.findMany({
        include: {
            _count: {
                select: { prices: true }
            }
        }
    });

    // Validating relationship: Price has marketId. Product doesn't strictly have marketId in this schema (it's many-to-many via Price usually, but let's check schema).
    // Actually, in many simple scrapers, Price holds the link.
    // Let's count Prices per Market, as that indicates "active offers".

    for (const m of markets) {
        const priceCount = await prisma.price.count({
            where: { marketId: m.id }
        });
        console.log(`[${m.name}] (ID: ${m.id})`);
        console.log(`  - Prices/Offers: ${priceCount}`);
    }
}

check()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
