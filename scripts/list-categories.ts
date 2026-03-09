
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const categories = await prisma.product.groupBy({
        by: ['category'],
        _count: {
            category: true,
        },
    });
    console.log(JSON.stringify(categories, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
