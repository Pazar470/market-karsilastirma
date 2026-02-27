
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function alignCategories() {
    console.log('Aligning market categories...');

    try {
        // 1. Rename 'Ekmek & Pastane' to 'Fırın & Pastane' for Şok
        const market = await prisma.market.findFirst({ where: { name: 'Şok' } });
        if (market) {
            // Find products in this market with the old category
            // Since category is on Product, not Price, we need to be careful.
            // But wait, Product.category is market-agnostic? NO.
            // Our schema has `Product.category` which is currently just the scraper's category string.
            // If the same product exists in multiple markets with different categories, how is it handled?
            // Currently: `seed-sok.ts` does: `product.category = item.category || 'Uncategorized'`
            // It only creates product if valid.

            // So if we have products created by Şok scraper, they have 'Ekmek & Pastane'.
            // We should update them.

            const result = await prisma.product.updateMany({
                where: {
                    category: 'Ekmek & Pastane'
                },
                data: {
                    category: 'Fırın & Pastane'
                }
            });
            console.log(`Updated ${result.count} products from 'Ekmek & Pastane' to 'Fırın & Pastane'.`);

            // Also check 'Temizlik' vs 'Temizlik Ürünleri' if needed.
            // A101 uses 'Temizlik', Şok uses 'Temizlik'. Good.

        } else {
            console.log('Şok market not found.');
        }

    } catch (error) {
        console.error('Error alignment:', error);
    } finally {
        await prisma.$disconnect();
    }
}

alignCategories();
