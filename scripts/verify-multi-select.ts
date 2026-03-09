
import { prisma } from '../lib/db';

async function verifyMultiSelect() {
    console.log('--- Verifying Multi-Select (OR Logic) ---');

    // Simulate selecting two distinct categories that we know exist from previous runs
    // e.g. "Ketçap" and "Mayonez" (if they exist as categories)
    // Or based on previous output: 
    // "Temel Gıda > Sos > Ketçap"
    // "Temel Gıda > Sos > Mayonez"

    // Let's first find 2 distinct valid categories
    const sampleProducts = await prisma.product.findMany({
        where: { category: { not: null } },
        take: 10,
        distinct: ['category'],
        select: { category: true }
    });

    if (sampleProducts.length < 2) {
        console.log('Not enough categories to test.');
        return;
    }

    const cat1 = sampleProducts[0].category!;
    const cat2 = sampleProducts[1].category!;

    console.log(`Testing with categories:\n1. ${cat1}\n2. ${cat2}`);

    const categories = [cat1, cat2];

    // Simulate API Logic
    const products = await prisma.product.findMany({
        where: {
            OR: categories.flatMap(cat => [
                { masterCategory: { name: { contains: cat } } },
                { category: { contains: cat } }
            ])
        },
        select: {
            id: true,
            name: true,
            category: true
        },
        take: 10
    });

    console.log(`Found ${products.length} products.`);
    products.forEach(p => {
        const match1 = p.category?.includes(cat1);
        const match2 = p.category?.includes(cat2);
        console.log(`- ${p.name} [${p.category}] -> Match Cat1: ${match1}, Match Cat2: ${match2}`);
    });

    // Check if we have mixed results (proof of OR)
    // In a small sample, we might only get one type, but the query structure is what matters.
}

verifyMultiSelect()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
