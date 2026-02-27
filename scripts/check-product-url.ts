
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProduct() {
    const products = await prisma.product.findMany({
        where: {
            name: {
                contains: 'Gezen Tavuk Yumurta M 10',
            }
        },
        include: {
            prices: {
                include: { market: true }
            }
        }
    });

    console.log(`Found ${products.length} products matching 'Gezen Tavuk Yumurta M 10'`);

    for (const p of products) {
        if (p.name.includes('Yumurta') || p.name.includes('Tavuk')) {
            console.log('---');
            console.log(`Name: ${p.name}`);
            console.log(`ID: ${p.id}`);
            p.prices.forEach(pr => {
                console.log(`  Market: ${pr.market.name}`);
                console.log(`  Price: ${pr.amount}`);
                console.log(`  URL: ${pr.productUrl}`);
                console.log(`  Date: ${pr.date}`);
            });
        }
    }
}

checkProduct()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
