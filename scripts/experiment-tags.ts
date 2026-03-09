
import { prisma } from '../lib/db';

const STOP_WORDS = new Set([
    'a101', 'migros', 'sok', 'carrefour', 'bim',
    'g', 'gr', 'kg', 'l', 'ml', 'litre', 'adet', 'paket',
    've', 'ile', 'li', 'lu', 's', 'm', 'l', 'xl',
    'marka', 'ürün', 'fiyat', 'tarih', 'market',
    // Common brand names or noise
    'pınar', 'torku', 'içim', 'sütaş', 'bahçıvan', 'muratbey', 'tahsildaroğlu',
    'sek', 'kebir', 'peyniri', 'peynir', 'kaşar', 'kaşarı'
]);

async function analyzeTags() {
    const CATEGORY_SLUG = 'kasar-peyniri';
    console.log(`--- Analyzing Tags for: ${CATEGORY_SLUG} ---`);

    const category = await prisma.category.findUnique({ where: { slug: CATEGORY_SLUG } });
    if (!category) return console.error('Category not found');

    const products = await prisma.product.findMany({
        where: { categoryId: category.id },
        select: { name: true }
    });

    const wordCounts: Record<string, number> = {};

    products.forEach(p => {
        // Normalize: lowercase, remove special chars, split by space
        const words = p.name.toLowerCase()
            .replace(/[()\/\\.0-9]/g, '') // Remove numbers and punctuation
            .split(/\s+/)
            .filter(w => w.length > 2); // Min 3 chars

        words.forEach(w => {
            if (!STOP_WORDS.has(w)) {
                wordCounts[w] = (wordCounts[w] || 0) + 1;
            }
        });
    });

    // Sort by frequency
    const sorted = Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);

    console.log('Top 20 Potential Filters:');
    sorted.forEach(([word, count]) => {
        const percentage = Math.round((count / products.length) * 100);
        console.log(`- ${word}: ${count} (%${percentage})`);
    });
}

analyzeTags()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
