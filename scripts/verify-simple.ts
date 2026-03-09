
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verify() {
    console.log('--- SIMPLE VERIFICATION ---');

    const count = await prisma.product.count();
    console.log(`Total Products: ${count}`);

    const markets = await prisma.market.findMany({ include: { prices: true } });
    for (const m of markets) {
        console.log(`Market ${m.name}: ${m.prices.length} prices`);
    }

    const kasars = await prisma.product.findMany({
        where: { name: { contains: 'Kaşar' } },
        take: 5
    });
    console.log('Sample Kaşar products:');
    kasars.forEach(p => console.log(`- ${p.name} (${p.category})`));
}

verify()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
