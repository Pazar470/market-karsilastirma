/**
 * Ana kategori = "Diğer" olan ürünleri listeler.
 * tags[0] = mapper'da eşleşmeyen yaprak ismi (marketin ham ismi aynen yazılmış).
 * Böylece hangi market yaprak isimlerinin RAW_MAP'te olmadığını görürüz.
 *
 * Çalıştır: npx tsx scripts/list-diger-yapraklar.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const products = await prisma.product.findMany({
        where: { category: 'Diğer' },
        select: { id: true, name: true, tags: true }
    });

    const byYaprak: Record<string, { count: number; sampleNames: string[] }> = {};
    for (const p of products) {
        let tags: string[] = [];
        try {
            tags = p.tags ? JSON.parse(p.tags) : [];
        } catch (_) {}
        const yaprak = (tags[0] || '(tags yok)') as string;
        if (!byYaprak[yaprak]) {
            byYaprak[yaprak] = { count: 0, sampleNames: [] };
        }
        byYaprak[yaprak].count++;
        if (byYaprak[yaprak].sampleNames.length < 3) {
            byYaprak[yaprak].sampleNames.push(p.name.slice(0, 50));
        }
    }

    console.log(`Toplam "Diğer" ana kategorideki ürün: ${products.length}\n`);
    console.log('--- Yaprak (tags[0] = mapper\'da eşleşmeyen ham isim) bazında ---\n');

    const sorted = Object.entries(byYaprak).sort((a, b) => b[1].count - a[1].count);
    for (const [yaprak, { count, sampleNames }] of sorted) {
        console.log(`${yaprak}: ${count} ürün`);
        sampleNames.forEach(s => console.log(`  Örnek: ${s}${s.length >= 50 ? '…' : ''}`));
        console.log('');
    }

    console.log('--- Özet: category-mapper RAW_MAP\'e eklenecek adaylar (yaprak ismi) ---');
    console.log(sorted.map(([y]) => `'${y.toLowerCase().trim()}'`).join(', '));
    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    prisma.$disconnect();
});
