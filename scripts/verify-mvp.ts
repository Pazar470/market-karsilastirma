
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
    console.log('--- Category Link Verification ---');
    const productsWithCats = await prisma.product.findMany({
        where: { categoryId: { not: null } },
        take: 20,
        select: { name: true, category: true, categoryId: true, masterCategory: { select: { name: true } } }
    });

    productsWithCats.forEach(p => {
        console.log(`Product: ${p.name}`);
        console.log(`  Master (Legacy): ${p.category}`);
        console.log(`  Leaf Category (Real): ${p.masterCategory?.name}`);
        console.log('---');
    });

    console.log('\n--- Trash Bag (Çöp Poşeti) Tagging Verification ---');
    const trashBags = await prisma.product.findMany({
        where: { name: { contains: 'Çöp' } },
        take: 10,
        select: { name: true, tags: true }
    });

    trashBags.forEach(p => {
        console.log(`Product: ${p.name}`);
        console.log(`  Tags: ${p.tags}`);
        console.log('---');
    });
}

verify().finally(() => prisma.$disconnect());
