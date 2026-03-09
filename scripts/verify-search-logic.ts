
import { prisma } from '../lib/db';

async function verifySearch(query: string) {
    console.log(`--- Verifying Search for: "${query}" ---`);

    const terms = query.split(' ').filter(t => t.length > 0);
    const nameConditions = terms.map(term => ({
        name: { contains: term }
    }));

    // 1. Fetch Products matching query
    const products = await prisma.product.findMany({
        where: {
            AND: [
                ...nameConditions
            ]
        },
        select: {
            id: true,
            name: true,
            category: true, // Market Path
            masterCategory: { select: { name: true } }
        },
        take: 20
    });

    console.log(`Found ${products.length} products.`);

    // 2. Calculate Facets (Logic from API)
    const categoryCounts: Record<string, number> = {};
    products.forEach(p => {
        const cat = p.category;
        if (cat) {
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        }
    });

    const facets = Object.entries(categoryCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    console.log('--- Facets ---');
    facets.slice(0, 10).forEach(f => {
        console.log(`[${f.count}] ${f.name}`);
    });

    console.log('--- Sample Products ---');
    products.slice(0, 5).forEach(p => {
        console.log(`- ${p.name} (${p.category})`);
    });
}

async function main() {
    await verifySearch('Ketçap');
    await verifySearch('Salam');
    await verifySearch('Peynir');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
