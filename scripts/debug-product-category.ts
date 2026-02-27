
import { prisma } from '../lib/db';

async function debugProductCategory() {
    const keyword = process.argv[2] || 'Salam';
    console.log(`--- Searching for products matching "${keyword}" ---`);

    const products = await prisma.product.findMany({
        where: { name: { contains: keyword } },
        include: { masterCategory: true },
        take: 5
    });

    for (const p of products) {
        console.log(`Product: ${p.name}`);
        console.log(`  Category ID: ${p.categoryId}`);
        console.log(`  Category Name: ${p.masterCategory?.name} (${p.masterCategory?.slug})`);
        console.log('---');
    }
}

debugProductCategory()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
