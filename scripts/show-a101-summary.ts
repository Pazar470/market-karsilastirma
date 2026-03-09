/**
 * DB'de A101 ürünleri varsa yaprak/ana dağılımını gösterir.
 * Tarama bitince çalıştır: npx tsx scripts/show-a101-summary.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const market = await prisma.market.findFirst({ where: { name: 'A101' } });
    if (!market) {
        console.log('A101 market bulunamadı.');
        return;
    }
    const products = await prisma.product.findMany({
        where: { prices: { some: { marketId: market.id } } },
        include: { prices: { where: { marketId: market.id } } }
    });
    console.log(`Toplam A101 ürün: ${products.length}`);

    const byYaprak: Record<string, number> = {};
    const byAna: Record<string, number> = {};
    for (const p of products) {
        let tags: string[] = [];
        try {
            tags = p.tags ? JSON.parse(p.tags) : [];
        } catch (_) {}
        const yaprak = (tags[0] || p.category || 'Diğer') as string;
        byYaprak[yaprak] = (byYaprak[yaprak] || 0) + 1;
        const ana = p.category || 'Diğer';
        byAna[ana] = (byAna[ana] || 0) + 1;
    }
    console.log('\n--- Yaprak (tags[0]) bazında (ilk 25) ---');
    Object.entries(byYaprak).sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
    console.log('\n--- Ana kategori bazında ---');
    Object.entries(byAna).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    prisma.$disconnect();
});
