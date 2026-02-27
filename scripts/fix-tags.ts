
import { PrismaClient } from '@prisma/client';
import { getMappedCategory } from '../lib/category-mapper.ts';

const prisma = new PrismaClient();

async function fixTags() {
    console.log('🚀 Fixing tags for all products based on functional rules...');

    // Fetch all products with relevant info for tagging
    const products = await prisma.product.findMany({
        select: {
            id: true,
            name: true,
            category: true, // legacy master category name
            masterCategory: { select: { name: true } } // real leaf category name
        }
    });

    console.log(`🔍 Total products to check: ${products.length}`);
    let updateCount = 0;

    for (const p of products) {
        // Use the leaf category name for better mapping fallback
        const currentCategory = p.masterCategory?.name || p.category || '';

        // Find store from product (we need store for getMappedCategory but we don't store it in Product table directly yet...)
        // Actually, stores are in Market table and linked via Price. 
        // For tagging, we'll try to guess store or just use a default since our tagging is now mostly generic.

        // Let's find the market for this product
        const firstPrice = await prisma.price.findFirst({
            where: { productId: p.id },
            include: { market: true }
        });
        const store = firstPrice?.market?.name || 'MIGROS'; // Fallback to Migros for tagging rules

        const mapped = getMappedCategory(store, '', currentCategory, p.name);
        const newTagsJson = JSON.stringify(mapped.tags);

        // Update if needed
        await prisma.product.update({
            where: { id: p.id },
            data: { tags: newTagsJson }
        });
        updateCount++;
        if (updateCount % 100 === 0) console.log(`Processed ${updateCount} products...`);
    }

    console.log(`✅ Finished! Updated ${updateCount} products.`);
}

fixTags().catch(console.error).finally(() => prisma.$disconnect());
