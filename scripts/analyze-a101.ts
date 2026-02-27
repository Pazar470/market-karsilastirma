
import { prisma } from '../lib/db';

async function main() {
    const market = await prisma.market.findFirst({ where: { name: 'A101' } });
    if (!market) return;

    const products = await prisma.price.findMany({
        where: { marketId: market.id },
        select: { product: { select: { categoryId: true } } }
    });

    // Group by categoryId
    const counts: Record<string, number> = {};
    for (const p of products) {
        const cat = p.product.categoryId || 'Uncategorized';
        counts[cat] = (counts[cat] || 0) + 1;
    }

    // Get Category Names
    const categories = await prisma.category.findMany();
    const catMap = new Map(categories.map(c => [c.id, c.name]));

    console.log('--- A101 Breakdown ---');
    Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .forEach(([id, count]) => {
            const name = catMap.get(id) || id;
            console.log(`${name}: ${count}`);
        });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
