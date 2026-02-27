
import { prisma } from '../lib/db';

async function debug() {
    console.log('--- Debugging Product Category ---');

    // Find an Ayçiçek Yağı
    const product = await prisma.product.findFirst({
        where: { name: { contains: 'Ayçiçek Yağı' } }
    });

    if (!product) {
        console.log('No Ayçiçek Yağı found!');
        return;
    }

    console.log(`Product: ${product.name}`);
    console.log(`Market Category String: ${product.category}`);
    console.log(`Mapped Category ID: ${product.categoryId}`);

    if (product.categoryId) {
        const cat = await prisma.category.findUnique({ where: { id: product.categoryId } });
        console.log(`Mapped Category Name: ${cat?.name}`);
        console.log(`Mapped Category Slug: ${cat?.slug}`);
    } else {
        console.log('Not mapped to any Master Category.');
    }
}

debug();
