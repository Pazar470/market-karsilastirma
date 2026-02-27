
import { prisma } from '../lib/db';

async function check() {
    const total = await prisma.product.count();
    const mapped = await prisma.product.count({
        where: { categoryId: { not: null } }
    });

    console.log(`Total Products: ${total}`);
    console.log(`Mapped Products: ${mapped}`);
    console.log(`Progress: ${((mapped / total) * 100).toFixed(1)}%`);
}

check().finally(() => prisma.$disconnect());
