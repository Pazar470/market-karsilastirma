
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRice() {
    try {
        const query = 'Hasata';
        const query2 = 'Ovadan';

        console.log(`Searching for "${query}" and "${query2}"...`);

        const products = await prisma.product.findMany({
            where: {
                OR: [
                    { name: { contains: query } },
                    { name: { contains: query2 } }
                ]
            },
            include: {
                prices: {
                    include: { market: true }
                }
            }
        });

        console.log(`Found ${products.length} products.`);
        products.forEach(p => {
            console.log(`- ${p.name} (${p.prices[0]?.market.name}) - ${p.prices[0]?.amount} TL`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkRice();
