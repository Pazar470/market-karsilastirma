
import { prisma } from '../lib/db';

async function cleanup() {
    console.log('--- Deleting Orphan Products ---');

    // Find products with no prices
    const orphans = await prisma.product.findMany({
        where: {
            prices: { none: {} }
        },
        select: { id: true, name: true }
    });

    console.log(`Found ${orphans.length} orphan products.`);

    if (orphans.length > 0) {
        const deleted = await prisma.product.deleteMany({
            where: {
                id: { in: orphans.map(p => p.id) }
            }
        });
        console.log(`Deleted ${deleted.count} orphans.`);
    }
}

cleanup()
    .finally(() => prisma.$disconnect());
