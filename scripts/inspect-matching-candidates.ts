
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspect() {
    const products = await prisma.product.findMany({
        include: {
            prices: {
                include: {
                    market: true
                }
            }
        }
    });

    console.log(`Total products: ${products.length}`);

    // Group by simple normalized name to see potential matches
    const nameGroups: Record<string, string[]> = {};

    products.forEach(p => {
        // Simple normalization: lowercase, remove special chars
        const key = p.name.toLowerCase().replace(/[^a-z0-9şğüöçipe]/g, ' ').trim();
        if (!nameGroups[key]) {
            nameGroups[key] = [];
        }
        nameGroups[key].push(`[${p.prices[0]?.market.name ?? 'Unknown'}] ${p.name}`);
    });

    console.log('--- POTENTIAL MATCHES (By Exact Simplified Name) ---');
    Object.entries(nameGroups).forEach(([key, items]) => {
        if (items.length > 1) {
            console.log(`KEY: ${key}`);
            items.forEach(i => console.log(`  - ${i}`));
        }
    });

    console.log('\n--- SAMPLE UNMATCHED items ---');
    const singles = Object.entries(nameGroups).filter(([k, v]) => v.length === 1).slice(0, 20);
    singles.forEach(([key, items]) => {
        console.log(`KEY: ${key} -> ${items[0]}`);
    });
}

inspect()
    .finally(async () => {
        await prisma.$disconnect();
    });
