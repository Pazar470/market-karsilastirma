
import { prisma } from '../lib/db';

async function verifyGranular() {
    console.log('--- Verifying Granular Categories ---');
    const granularSlugs = ['seker', 'tuz', 'baharat', 'salca', 'soslar', 'un', 'pastane-malzemeleri'];

    for (const slug of granularSlugs) {
        const category = await prisma.category.findUnique({
            where: { slug },
            include: { _count: { select: { products: true } } }
        });

        if (category) {
            console.log(`✅ ${category.name} (${slug}): ${category._count.products} products`);
        } else {
            console.log(`❌ ${slug}: NOT FOUND`);
        }
    }
}

verifyGranular()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
