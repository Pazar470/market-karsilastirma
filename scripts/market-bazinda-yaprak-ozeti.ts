/**
 * Market bazında yaprak (tags[0]) dağılımı.
 * Tarama sonrası "kim nerede, yaprak kategoriler doğru eşleşmiş mi" kontrolü için.
 *
 * Çalıştır: npx tsx scripts/market-bazinda-yaprak-ozeti.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const markets = await prisma.market.findMany({ orderBy: { name: 'asc' } });
  const marketIds = new Map(markets.map(m => [m.id, m.name]));

  // Ürünleri markete göre (price üzerinden) grupla; her ürün bir markete ait (o marketten fiyatı olan)
  const byMarket: Record<string, Record<string, number>> = {};
  for (const m of markets) {
    byMarket[m.name] = {};
  }

  const products = await prisma.product.findMany({
    include: { prices: { select: { marketId: true } } },
  });

  for (const p of products) {
    let yaprak = '—';
    try {
      const tags = JSON.parse(p.tags || '[]') as string[];
      if (tags[0]) yaprak = tags[0];
    } catch (_) {}
    const marketId = p.prices[0]?.marketId;
    if (!marketId) continue;
    const marketName = marketIds.get(marketId);
    if (!marketName || !byMarket[marketName]) continue;
    byMarket[marketName][yaprak] = (byMarket[marketName][yaprak] || 0) + 1;
  }

  console.log('\n=== MARKET BAZINDA YAPRAK (tags[0]) ÖZETİ ===\n');
  for (const m of markets) {
    const dist = byMarket[m.name] || {};
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    const sorted = Object.entries(dist).sort((a, b) => b[1] - a[1]);
    console.log(`\n--- ${m.name} (toplam ${total} ürün) ---`);
    sorted.slice(0, 25).forEach(([yaprak, count]) => {
      console.log(`  ${yaprak}: ${count}`);
    });
    if (sorted.length > 25) console.log(`  ... ve ${sorted.length - 25} yaprak daha`);
  }

  // Aynı yaprakta kaç market var? (doğru eşleşme = aynı canonical'da 3 market)
  const byYaprak: Record<string, Set<string>> = {};
  for (const p of products) {
    let yaprak = '—';
    try {
      const tags = JSON.parse(p.tags || '[]') as string[];
      if (tags[0]) yaprak = tags[0];
    } catch (_) {}
    const marketName = p.prices[0] ? marketIds.get(p.prices[0].marketId) : null;
    if (!marketName) continue;
    if (!byYaprak[yaprak]) byYaprak[yaprak] = new Set();
    byYaprak[yaprak].add(marketName);
  }
  const crossMarket = Object.entries(byYaprak).filter(([, set]) => set.size > 1);
  console.log('\n=== AYNI YAPRAKTA BİRDEN FAZLA MARKET (yaprak eşleşmesi) ===');
  console.log(`Toplam ${crossMarket.length} yaprak en az 2 markette ürün içeriyor.\n`);
  crossMarket.sort((a, b) => b[1].size - a[1].size);
  crossMarket.slice(0, 20).forEach(([yaprak, set]) => {
    console.log(`  ${yaprak}: ${[...set].sort().join(', ')}`);
  });

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
