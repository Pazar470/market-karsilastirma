
import { prisma } from '../lib/db';

async function listCats() {
    const products = await prisma.product.findMany({
        select: { category: true },
        distinct: ['category']
    });

    console.log('--- Distinct Categories in DB ---');
    products.forEach(p => console.log(p.category));
}

listCats()
    .finally(() => prisma.$disconnect());
