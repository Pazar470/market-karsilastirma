
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLetoon() {
    try {
        const query = 'Letoon';
        console.log(`Searching for "${query}"...`);

        const products = await prisma.product.findMany({
            where: {
                name: { contains: query }
            },
            include: {
                prices: {
                    include: { market: true }
                }
            }
        });

        console.log(`Found ${products.length} products.`);
        products.forEach(p => {
            console.log(`- ${p.name}`);
            p.prices.forEach(pr => {
                console.log(`  * ${pr.amount} ${pr.currency} (${pr.market.name})`);
            });
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkLetoon();
