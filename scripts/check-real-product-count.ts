
import { prisma } from '../lib/db';

async function checkRealCount() {
    console.log('--- Checking Real Product Count ---');

    // Count ALL products
    const total = await prisma.product.count();
    console.log(`Total Products in DB: ${total}`);

    // Check Peynir count by string match
    const peynirCount = await prisma.product.count({
        where: {
            category: { contains: 'Peynir' }
        }
    });
    console.log(`Products with category containing 'Peynir': ${peynirCount}`);

    // List top 5 products to verify content
    const sample = await prisma.product.findMany({ take: 5 });
    console.log('Sample Products:', sample.map(p => `${p.name} [${p.category}]`));
}

checkRealCount()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
