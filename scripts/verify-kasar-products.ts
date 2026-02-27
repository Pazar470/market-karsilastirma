
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    const products = await prisma.product.findMany({
        where: {
            category: { contains: 'Kaşar Peyniri' }
        },
        select: { name: true, category: true }
    });

    console.log(`Found ${products.length} Kaşar products in DB:`);
    products.forEach(p => console.log(`- [${p.category}] ${p.name}`));
}

check()
    .finally(async () => await prisma.$disconnect());
