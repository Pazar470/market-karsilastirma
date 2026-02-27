
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
    console.log('--- Starting Daily Price Deduping ---');

    // Strategy:
    // 1. Group prices by (productId, marketId, date(createdAt))
    // 2. Identify groups with count > 1
    // 3. Keep the latest one, delete others

    // Since Prisma groupBy doesn't support date truncation easily in all DBs,
    // we will fetch all prices and process in memory (safe for 50k records).
    // For millions, we'd use raw SQL.

    const allPrices = await prisma.price.findMany({
        orderBy: { date: 'desc' }
    });

    console.log(`Scanning ${allPrices.length} price entries...`);

    const seenKey = new Set<string>();
    const toDelete: string[] = [];

    for (const p of allPrices) {
        const dateStr = p.date.toISOString().split('T')[0]; // YYYY-MM-DD
        const key = `${p.productId}-${p.marketId}-${dateStr}`;

        if (seenKey.has(key)) {
            // Already saw a newer price for this product-market-day combination
            toDelete.push(p.id);
        } else {
            seenKey.add(key);
        }
    }

    if (toDelete.length > 0) {
        console.log(`Found ${toDelete.length} duplicate entries to delete.`);

        // Delete in chunks
        const CHUNK_SIZE = 1000;
        for (let i = 0; i < toDelete.length; i += CHUNK_SIZE) {
            const chunk = toDelete.slice(i, i + CHUNK_SIZE);
            await prisma.price.deleteMany({
                where: { id: { in: chunk } }
            });
            process.stdout.write('.');
        }
        console.log('\nCleanup complete.');
    } else {
        console.log('No duplicates found. Database is clean.');
    }
}

cleanup()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
