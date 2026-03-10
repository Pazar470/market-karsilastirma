import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** Bekleyen market+kategori kodları: categoryId'si null olan ürünlerin market + marketCategoryCode listesi.
 * Son 48 saatte fiyatı olan ürünler dahil (timezone/sunucu saati kaynaklı kaçırma riskine karşı 48h).
 * Her ürün için en son dolu marketCategoryCode kullanılır (son fiyatta kod yoksa önceki fiyatlara bakılır). */
const PRICES_TAKE = 25;
const RECENT_HOURS = 48;

export async function GET() {
    const unauth = await requireAdmin();
    if (unauth) return unauth;
    try {
        const priceMinDate = new Date();
        priceMinDate.setHours(priceMinDate.getHours() - RECENT_HOURS, 0, 0, 0);

        const products = await prisma.product.findMany({
            where: {
                categoryId: null,
                prices: { some: { date: { gte: priceMinDate } } },
            },
            select: {
                id: true,
                prices: {
                    orderBy: { date: 'desc' },
                    take: PRICES_TAKE,
                    select: {
                        date: true,
                        marketCategoryCode: true,
                        marketCategoryPath: true,
                        marketId: true,
                    },
                },
            },
        });

        const marketIds = [...new Set(products.flatMap((p) => p.prices.map((pr) => pr.marketId)))];
        const markets = marketIds.length
            ? await prisma.market.findMany({
                  where: { id: { in: marketIds } },
                  select: { id: true, name: true },
              })
            : [];
        const marketNameById = Object.fromEntries(markets.map((m) => [m.id, m.name]));

        const keyToCount = new Map<string, number>();
        const keyToPath = new Map<string, string>();
        const keyToNoCode = new Set<string>();

        for (const p of products) {
            const latestPrice = p.prices[0];
            if (!latestPrice || latestPrice.date < priceMinDate) continue;
            const lastWithCode = p.prices.find((pr) => pr.marketCategoryCode && String(pr.marketCategoryCode).trim() !== '');
            const last = lastWithCode ?? p.prices[0];
            if (!last) continue;
            const marketName = marketNameById[last.marketId] ?? `Market:${last.marketId}`;
            const code = last.marketCategoryCode && String(last.marketCategoryCode).trim() !== '' ? String(last.marketCategoryCode).trim() : '';
            const key = `${marketName}\t${code}`;
            keyToCount.set(key, (keyToCount.get(key) || 0) + 1);
            if (last.marketCategoryPath && !keyToPath.has(key)) keyToPath.set(key, last.marketCategoryPath);
            if (code === '') keyToNoCode.add(key);
        }

        const keys = Array.from(keyToCount.entries()).map(([key]) => key.split('\t') as [string, string]);
        const manuelSet = new Set<string>();
        if (keys.length > 0) {
            const manuelRows = await prisma.marketCategoryManuel.findMany({
                where: {
                    OR: keys.map(([marketName, marketCategoryCode]) => ({
                        marketName,
                        marketCategoryCode,
                    })),
                },
                select: { marketName: true, marketCategoryCode: true },
            });
            for (const r of manuelRows) manuelSet.add(`${r.marketName}\t${r.marketCategoryCode}`);
        }

        const list = Array.from(keyToCount.entries()).map(([key, productCount]) => {
            const [marketName, marketCategoryCode] = key.split('\t');
            return {
                marketName,
                marketCategoryCode,
                marketCategoryName: keyToPath.get(key) ?? (keyToNoCode.has(key) ? '(Kategori kodu yok)' : null),
                productCount,
                isManuel: manuelSet.has(key),
                isNoCode: keyToNoCode.has(key),
            };
        });

        return NextResponse.json(list);
    } catch (e) {
        console.error('GET /api/admin/pending-category-mappings', e);
        return NextResponse.json({ error: 'Failed to fetch pending mappings' }, { status: 500 });
    }
}
