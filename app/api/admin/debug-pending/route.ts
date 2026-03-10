/**
 * Admin bekleyen liste tanı: API'nin gördüğü sayıları döndürür (48h filtresi dahil).
 * Neden boş çıktığını anlamak için: deploy sonrası /api/admin/debug-pending çağır (admin girişi gerekir).
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const RECENT_HOURS = 48;

export async function GET() {
    const unauth = await requireAdmin();
    if (unauth) return unauth;
    try {
        const priceMinDate = new Date();
        priceMinDate.setHours(priceMinDate.getHours() - RECENT_HOURS, 0, 0, 0);

        const totalNull = await prisma.product.count({ where: { categoryId: null } });
        const nullWithRecentPrice = await prisma.product.count({
            where: {
                categoryId: null,
                prices: { some: { date: { gte: priceMinDate } } },
            },
        });

        const products = await prisma.product.findMany({
            where: {
                categoryId: null,
                prices: { some: { date: { gte: priceMinDate } } },
            },
            select: {
                id: true,
                prices: {
                    orderBy: { date: 'desc' },
                    take: 1,
                    select: { marketId: true, marketCategoryCode: true, date: true },
                },
            },
            take: 100,
        });

        const marketIds = [...new Set(products.flatMap((p) => (p.prices[0] ? [p.prices[0].marketId] : [])))];
        const markets =
            marketIds.length > 0
                ? await prisma.market.findMany({
                      where: { id: { in: marketIds } },
                      select: { id: true, name: true },
                  })
                : [];
        const marketNameById = Object.fromEntries(markets.map((m) => [m.id, m.name]));

        const keyCounts: Record<string, number> = {};
        let skippedNoPrice = 0;
        let skippedOldPrice = 0;
        let skippedNoMarket = 0;
        for (const p of products) {
            const last = p.prices[0];
            if (!last) {
                skippedNoPrice++;
                continue;
            }
            if (last.date < priceMinDate) {
                skippedOldPrice++;
                continue;
            }
            const marketName = marketNameById[last.marketId];
            if (!marketName) skippedNoMarket++;
            const name = marketName ?? `Market:${last.marketId}`;
            const code = (last.marketCategoryCode && String(last.marketCategoryCode).trim()) || '';
            const key = `${name}\t${code}`;
            keyCounts[key] = (keyCounts[key] || 0) + 1;
        }

        return NextResponse.json({
            serverTime: new Date().toISOString(),
            priceMinDate: priceMinDate.toISOString(),
            totalNull,
            nullWithRecentPrice,
            sampleSize: products.length,
            marketCount: markets.length,
            marketIdsInPrices: marketIds.length,
            marketsFound: markets.map((m) => m.name),
            skippedNoPrice,
            skippedOldPrice,
            skippedNoMarket,
            keyCounts: Object.entries(keyCounts).map(([key, count]) => ({ key, count })),
        });
    } catch (e) {
        console.error('GET /api/admin/debug-pending', e);
        return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 500 });
    }
}
