
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyze() {
    try {
        const categories = await prisma.product.groupBy({
            by: ['category'],
            _count: { id: true }
        });

        console.log('\n========================================');
        console.log('📊 KATEGORİ BAZLI VERİ ÖZETİ');
        console.log('========================================');
        categories.sort((a, b) => (b._count.id || 0) - (a._count.id || 0)).forEach(c => {
            console.log(`${c.category.padEnd(20)} : ${c._count.id} ürün`);
        });

        const taggedProducts = await prisma.product.findMany({
            where: { tags: { not: '[]' } },
            take: 10,
            select: { name: true, tags: true, category: true }
        });

        console.log('\n========================================');
        console.log('🏷️ AKILLI ETİKET ÖRNEKLERİ');
        console.log('========================================');
        taggedProducts.forEach(p => {
            console.log(`[${p.category}] ${p.name.slice(0, 40).padEnd(42)} -> ${p.tags}`);
        });

    } catch (e) {
        console.error('Analiz hatası:', e);
    } finally {
        await prisma.$disconnect();
    }
}

analyze();
