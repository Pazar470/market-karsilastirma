/**
 * categoryId=null olan ürünleri listeler; son 24h fiyatı olan / olmayan diye ayırır.
 * Admin'de neden görünmediklerini anlamak ve Supabase'de manuel kontrol için kullanılır.
 *
 * Çalıştırma: npx tsx scripts/diagnose-null-products.ts
 * Çıktı: Konsol özeti + docs/diagnose-null-products.txt (ürün listesi)
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const RECENT_HOURS = 24;

async function main() {
    const priceMinDate = new Date();
    priceMinDate.setHours(priceMinDate.getHours() - RECENT_HOURS, 0, 0, 0);

    const nullProducts = await prisma.product.findMany({
        where: { categoryId: null },
        select: {
            id: true,
            name: true,
            categoryId: true,
            prices: {
                orderBy: { date: 'desc' },
                take: 1,
                select: { date: true, marketId: true, marketCategoryCode: true, marketCategoryPath: true },
            },
        },
    });

    const marketIds = [...new Set(nullProducts.flatMap((p) => (p.prices[0] ? [p.prices[0].marketId] : [])))];
    const markets =
        marketIds.length > 0
            ? await prisma.market.findMany({
                  where: { id: { in: marketIds } },
                  select: { id: true, name: true },
              })
            : [];
    const marketNameById = Object.fromEntries(markets.map((m) => [m.id, m.name]));

    type Row = { id: string; name: string; market: string; code: string; lastPriceDate: string; recent: boolean };
    const rows: Row[] = [];
    let recentCount = 0;
    let noPriceCount = 0;

    for (const p of nullProducts) {
        const last = p.prices[0];
        const marketName = last ? marketNameById[last.marketId] ?? '?' : '-';
        const code = last?.marketCategoryCode ?? '';
        const lastDate = last?.date;
        const lastDateStr = lastDate ? lastDate.toISOString() : '-';
        const recent = !!lastDate && lastDate >= priceMinDate;
        if (recent) recentCount++;
        if (!last) noPriceCount++;
        rows.push({
            id: p.id,
            name: p.name,
            market: marketName,
            code,
            lastPriceDate: lastDateStr,
            recent,
        });
    }

    const outPath = path.join(process.cwd(), 'docs', 'diagnose-null-products.txt');
    const lines: string[] = [
        `Tanı: categoryId=null ürünler — ${new Date().toISOString()}`,
        `Kesim: son ${RECENT_HOURS} saat = ${priceMinDate.toISOString()} ~ şimdi`,
        '',
        '--- ÖZET ---',
        `Toplam categoryId=null ürün: ${nullProducts.length}`,
        `Son 24 saatte fiyatı olan (admin listesinde görünmesi gereken): ${recentCount}`,
        `Son 24 saatte fiyatı olmayan (admin'de gösterilmez): ${nullProducts.length - recentCount}`,
        `Hiç fiyat kaydı olmayan: ${noPriceCount}`,
        '',
        '--- LİSTE (id | ad | market | marketCategoryCode | son fiyat tarihi | son24h) ---',
        '',
    ];
    for (const r of rows) {
        lines.push(`${r.id}\t${r.name.slice(0, 60)}${r.name.length > 60 ? '…' : ''}\t${r.market}\t${r.code}\t${r.lastPriceDate}\t${r.recent ? 'EVET' : 'HAYIR'}`);
    }
    const content = lines.join('\n');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, content, 'utf-8');

    console.log('--- categoryId=null ürün tanısı ---\n');
    console.log('Toplam null ürün:', nullProducts.length);
    console.log('Son 24 saatte fiyatı olan (admin\'de listelenir):', recentCount);
    console.log('Son 24 saatte fiyatı olmayan (admin\'de görünmez):', nullProducts.length - recentCount);
    console.log('Fiyat kaydı olmayan:', noPriceCount);
    console.log('\nDetay listesi yazıldı:', outPath);
    console.log('\nİlk 20 null ürün (id, ad, market, son fiyat tarihi, son24h):');
    rows.slice(0, 20).forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.id} | ${r.name.slice(0, 40)}… | ${r.market} | ${r.lastPriceDate.slice(0, 19)} | ${r.recent ? 'EVET' : 'HAYIR'}`);
    });
    if (rows.length > 20) {
        console.log('  ...');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
