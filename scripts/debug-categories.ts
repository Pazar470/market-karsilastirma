
import { prisma } from '../lib/db';

async function debugCategories() {
    console.log('--- All Categories in DB ---');
    const all = await prisma.category.findMany({
        orderBy: { name: 'asc' }
    });

    console.log(`Total: ${all.length}`);

    console.log('\n--- Specific Checks ---');
    const checkNames = ['Şeker', 'Tuz', 'Baharat', 'Salça', 'Soslar', 'Un', 'Pastane Malzemeleri', 'Şeker & Tuz & Baharat'];

    for (const name of checkNames) {
        const found = all.filter(c => c.name.includes(name) || c.slug.includes(name.toLowerCase()));
        if (found.length > 0) {
            console.log(`\nFound matching "${name}":`);
            found.forEach(c => console.log(`- [${c.id}] ${c.name} (${c.slug}) -> Parent: ${c.parentId}`));
        } else {
            console.log(`\n❌ NOT FOUND: "${name}"`);
        }
    }
}

debugCategories()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
