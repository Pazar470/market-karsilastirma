
import { prisma } from '../lib/db';

async function checkTostMakinesi() {
    console.log('--- Checking Tost Makinesi ---');
    const products = await prisma.product.findMany({
        where: { name: { contains: 'Tost Makinesi' } },
        include: { masterCategory: true }, // Only masterCategory is a relation
        take: 5
    });

    for (const p of products) {
        console.log(`Product: ${p.name}`);
        console.log(`  Current Master: ${p.masterCategory?.slug} (${p.categoryId})`);
        console.log(`  Market Category String: ${p.category}`);
        console.log('---');
    }
}

checkTostMakinesi()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
