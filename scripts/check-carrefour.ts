
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const count = await prisma.product.count({
        where: {
            prices: {
                some: {
                    market: { name: 'Carrefour' }
                }
            }
        }
    });
    console.log(`Carrefour Product Count: ${count}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
