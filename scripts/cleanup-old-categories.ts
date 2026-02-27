
import { prisma } from '../lib/db';

async function cleanupOldCategories() {
    console.log('--- Cleaning Up Ghost Categories ---');

    // List of slugs to NUKE
    const ghosts = [
        'seker-tuz-baharat',
        'salca-soslar',
        'un-pastane-malzemeleri'
    ];

    // Fallback category to dump products into (so we can delete the ghost)
    const fallback = await prisma.category.findUnique({ where: { slug: 'temel-gida' } });
    if (!fallback) {
        console.error('Cannot find fallback category (temel-gida)! Aborting.');
        return;
    }

    for (const slug of ghosts) {
        const category = await prisma.category.findUnique({
            where: { slug },
            include: { products: true }
        });

        if (!category) {
            console.error(`- Ghost not found (Already gone?): ${slug}`);
            continue;
        }

        console.error(`Found Ghost: ${category.name} (${slug}) - Has ${category.products.length} products.`);

        if (category.products.length > 0) {
            console.error(`  ⚠️ Moving ${category.products.length} products to "Temel Gıda"...`);
            await prisma.product.updateMany({
                where: { categoryId: category.id },
                data: { categoryId: fallback.id }
            });
            console.error('  ✅ Products moved.');
        }

        console.error(`  🔥 Deleting ghost category: ${category.name}...`);
        await prisma.category.delete({ where: { id: category.id } });
        console.error('  ✅ Deleted.');
    }
}

cleanupOldCategories()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
