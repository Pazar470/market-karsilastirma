
import { prisma } from '../lib/db';

async function list() {
    const cats = await prisma.category.findMany();
    console.log(`Total Categories: ${cats.length}`);
    cats.forEach(c => console.log(`${c.slug} : ${c.name}`));
}

list()
    .finally(() => prisma.$disconnect());
