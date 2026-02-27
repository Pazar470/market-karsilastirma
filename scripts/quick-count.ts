
import { prisma } from '../lib/db';

async function main() {
    const counts = await prisma.price.groupBy({
        by: ['marketId'],
        _count: { id: true }
    });

    const markets = await prisma.market.findMany();

    console.log('--- Counts ---');
    for (const m of markets) {
        const c = counts.find(x => x.marketId === m.id)?._count.id || 0;
        console.log(`${m.name}: ${c}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
