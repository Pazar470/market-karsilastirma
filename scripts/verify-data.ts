
import { prisma } from '../lib/db';

async function verify() {
    console.log('--- DATA VERIFICATION ---');

    const productCount = await prisma.product.count();
    console.log(`Total Products: ${productCount}`);

    // Count by Market
    const prices = await prisma.price.groupBy({
        by: ['marketId'],
        _count: true
    });

    const markets = await prisma.market.findMany();
    const marketMap = Object.fromEntries(markets.map(m => [m.id, m.name]));

    console.log('\nProducts by Market (Approx based on prices):');
    prices.forEach(p => {
        console.log(`- ${marketMap[p.marketId]}: ${p._count}`);
    });

    // Check Category Distribution
    console.log('\nTop 20 Categories (Raw Product Category):');
    const categories = await prisma.product.groupBy({
        by: ['category'],
        _count: true,
        orderBy: {
            _count: 'desc'
        },
        take: 20
    });
    categories.forEach(c => console.log(`- ${c.category}: ${c._count}`));

    // Check Kaşar specific
    console.log('\nKaşar Check:');
    const kasarProducts = await prisma.product.findMany({
        where: { name: { contains: 'Kaşar' } },
        select: { name: true, category: true, Store: true } // Store is not on product, implied via price?
        // Actually product doesn't handle store directly, but seed script puts store in console.
    });
    console.log(`Found ${kasarProducts.length} products with 'Kaşar' in name.`);
    // Sample 5
    kasarProducts.slice(0, 5).forEach(p => console.log(`  ${p.name} -> Cat: ${p.category}`));

}

verify()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
