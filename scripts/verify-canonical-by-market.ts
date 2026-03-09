/**
 * Aynı yaprak kategori (canonical) kontrolü:
 * Farklı marketlerden aynı tür ürünler aynı category + tags[0] (canonical) altında mı?
 * Çalıştırma: npx tsx scripts/verify-canonical-by-market.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    include: {
      prices: { take: 1, include: { market: true } },
    },
  });

  // canonical = tags JSON'unun ilk elemanı
  const byCanonical: Record<string, { ana: string; markets: Set<string>; names: string[] }> = {};
  for (const p of products) {
    const ana = p.category || 'Diğer';
    let canonical = '—';
    try {
      const tags = JSON.parse(p.tags || '[]') as string[];
      if (tags[0]) canonical = tags[0];
    } catch {}

    const key = `${ana}\t${canonical}`;
    if (!byCanonical[key]) {
      byCanonical[key] = { ana, markets: new Set(), names: [] };
    }
    const marketName = p.prices[0]?.market?.name;
    if (marketName) byCanonical[key].markets.add(marketName);
    byCanonical[key].names.push(p.name.slice(0, 40));
  }

  console.log('\n=== YAPRAK KATEGORİ (canonical) BAZINDA ÜRÜNLER ===\n');
  console.log('Ana Kategori\tYaprak (canonical)\tMarketler\tÖrnek ürün');
  console.log('—'.repeat(80));

  const entries = Object.entries(byCanonical).sort((a, b) => a[0].localeCompare(b[0]));
  for (const [key, v] of entries) {
    const markets = [...v.markets].sort().join(', ');
    const multiMarket = v.markets.size > 1 ? ' ✓ Çoklu market' : '';
    console.log(`${v.ana}\t${key.split('\t')[1]}\t${markets}${multiMarket}\t${v.names[0] || ''}`);
  }

  const multiMarketCanonicals = entries.filter(([, v]) => v.markets.size > 1);
  console.log('\n--- Aynı yaprak (canonical) altında birden fazla market (farklı marketler aynı tür) ---');
  if (multiMarketCanonicals.length === 0) {
    console.log('(Şu an sadece tek marketten veri var. Tam tarama: npx tsx scripts/monitored-scrape.ts ile 50+50+30 kategori çalıştırın; Kaşar Peyniri, Salça, Süt vb. hem Migros hem A101 hem Şok\'ta aynı canonical\'da toplanacak.)');
  } else {
    multiMarketCanonicals.forEach(([key, v]) => {
      console.log(`${key}: ${[...v.markets].join(', ')} — ${v.names.length} ürün`);
    });
  }

  console.log('\nToplam ürün:', products.length);
  console.log('Toplam canonical grup:', entries.length);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
