
import { prisma } from '../lib/db';

async function check() {
    const count = await prisma.product.count({
        where: { prices: { some: { market: { name: 'Şok' } } } }
    });
    console.log(`Şok Product Count: ${count}`);

    const sample = await prisma.product.findFirst({
        where: { prices: { some: { market: { name: 'Şok' } } } },
        include: { prices: { where: { market: { name: 'Şok' } } } }
    });
    console.log('Sample:', sample ? sample.name : 'None');
    console.log('Sample Price:', sample?.prices[0]?.amount);
    console.log('Sample URL:', sample?.prices[0]?.productUrl);
}

check().catch(e => console.error(e)).finally(() => prisma.$disconnect());
