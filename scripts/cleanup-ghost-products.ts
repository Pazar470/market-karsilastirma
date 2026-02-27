
import { prisma } from '../lib/db';

async function cleanupGhosts() {
    console.log('👻 GHOST PRODUCT CLEANUP STARTED');

    // Threshold: 3 days (Products not updated/seen in 3 days are considered stale)
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - 3);

    console.log(`Searching for products with no price update since ${thresholdDate.toISOString()}...`);

    // Find products where the LATEST price is older than threshold
    // This is a bit complex in Prisma. 
    // Alternative: Find all products, filter in memory (might be heavy if millions, but OK for 7k)
    // Or just check `updatedAt` on Product if my scraper updates it on every run.

    // Let's assume Scraper updates Product `updatedAt` when it processes it, even if price didn't change?
    // If not, we rely on Price date.

    const allProducts = await prisma.product.findMany({
        select: { id: true, name: true, prices: { take: 1, orderBy: { date: 'desc' } } }
    });

    let ghostCount = 0;
    const ghostIds: string[] = [];

    for (const p of allProducts) {
        if (!p.prices.length) {
            // No prices at all? Ghost.
            ghostIds.push(p.id);
            ghostCount++;
            continue;
        }

        const lastPriceDate = new Date(p.prices[0].date);
        if (lastPriceDate < thresholdDate) {
            // Stale
            ghostIds.push(p.id);
            ghostCount++;
            // console.log(`👻 Stale: ${p.id} - ${p.name} (Last seen: ${lastPriceDate.toISOString().split('T')[0]})`);
        }
    }

    console.log(`Found ${ghostCount} ghost products.`);

    if (ghostCount > 0) {
        console.log('Deleting ghosts...');
        // Batch delete
        // Delete prices first? Prisma cascade might handle it if relation is set.
        // Schema: prices Price[]
        // If cascade is not set in DB, we need to delete manually.
        // Let's try deleteMany on Product.

        // Delete in chunks
        const chunkSize = 100;
        for (let i = 0; i < ghostIds.length; i += chunkSize) {
            const chunk = ghostIds.slice(i, i + chunkSize);

            // Delete prices first just in case
            await prisma.price.deleteMany({
                where: { productId: { in: chunk } }
            });

            const res = await prisma.product.deleteMany({
                where: { id: { in: chunk } }
            });
            console.log(`Deleted ${res.count} products (Chunk ${i / chunkSize + 1}).`);
        }
    }

    console.log('✨ Cleanup complete.');
}

cleanupGhosts()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
