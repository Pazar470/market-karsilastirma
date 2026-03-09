/**
 * Aynı marketin iki ayrı kaydını (örn. "Şok" ve "Sok" — aynı URL) tek markette toplar.
 * Price, MarketCategoryMapping, MarketCategoryManuel güncellenir; çift Market silinir.
 *
 * Kullanım: npx tsx scripts/merge-duplicate-market.ts
 * (Şok/Sok için otomatik bulur; aynı URL'ye sahip marketleri birleştirir)
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const markets = await prisma.market.findMany({
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, url: true, createdAt: true },
    });

    // Aynı URL'ye sahip marketleri grupla (örn. sokmarket.com.tr → [Şok, Sok])
    const byUrl = new Map<string, typeof markets>();
    for (const m of markets) {
        const url = m.url.toLowerCase().trim();
        if (!byUrl.has(url)) byUrl.set(url, []);
        byUrl.get(url)!.push(m);
    }

    const toMerge = Array.from(byUrl.entries()).filter(([, list]) => list.length > 1);
    if (toMerge.length === 0) {
        console.log('Aynı URL\'ye sahip çift market kaydı yok. Çıkılıyor.');
        return;
    }

    for (const [url, list] of toMerge) {
        // İlk (en eski) kaydı canonical tut; diğerlerini buna taşı
        const [canonical, ...duplicates] = list;
        console.log(`\nURL: ${url}`);
        console.log(`  Kalacak (canonical): ${canonical.name} (id: ${canonical.id})`);
        for (const dup of duplicates) {
            console.log(`  Birleştirilecek: ${dup.name} (id: ${dup.id})`);

            const priceCount = await prisma.price.updateMany({
                where: { marketId: dup.id },
                data: { marketId: canonical.id },
            });
            console.log(`    Price güncellendi: ${priceCount.count}`);

            const mapCount = await prisma.marketCategoryMapping.updateMany({
                where: { marketName: dup.name },
                data: { marketName: canonical.name },
            });
            console.log(`    MarketCategoryMapping (marketName): ${mapCount.count}`);

            const manuelCount = await prisma.marketCategoryManuel.updateMany({
                where: { marketName: dup.name },
                data: { marketName: canonical.name },
            });
            console.log(`    MarketCategoryManuel (marketName): ${manuelCount.count}`);

            await prisma.market.delete({ where: { id: dup.id } });
            console.log(`    Market silindi: ${dup.name}`);
        }
    }

    console.log('\nBitti. Artık tek market adı kullanılıyor; ODS eşleşmeleri aynı isimle yapılmalı.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
