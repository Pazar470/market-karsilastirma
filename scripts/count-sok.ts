
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function countSok() {
    try {
        const market = await prisma.market.findFirst({
            where: { name: 'Şok' }
        });

        if (!market) {
            console.log('Şok market not found in DB.');
            return;
        }

        // Count prices associated with this market (closest proxy to "products in this market")
        // Or better, unique products that have a price from this market.
        const count = await prisma.price.count({
            where: { marketId: market.id }
        });

        // Also count distinct products
        const products = await prisma.price.findMany({
            where: { marketId: market.id },
            select: { productId: true },
            distinct: ['productId']
        });

        console.log(`Şok Market:`);
        console.log(`- Total Price Entries: ${count}`);
        console.log(`- Unique Products: ${products.length}`);

    } catch (error) {
        console.error('Error counting:', error);
    } finally {
        await prisma.$disconnect();
    }
}

countSok();
