import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** Bekleyen market+kategori kodları: categoryId'si null olan ürünlerin (son fiyatına göre) market + marketCategoryCode listesi. */
export async function GET() {
    const unauth = await requireAdmin();
    if (unauth) return unauth;
    try {
        const products = await prisma.product.findMany({
            where: { categoryId: null },
            select: {
                id: true,
                prices: {
                    orderBy: { date: 'desc' },
                    take: 1,
                    select: {
                        marketCategoryCode: true,
                        marketCategoryPath: true,
                        marketId: true,
                    },
                },
            },
        });

        const marketIds = [...new Set(products.flatMap((p) => (p.prices[0] ? [p.prices[0].marketId] : [])))];
        const markets = await prisma.market.findMany({
            where: { id: { in: marketIds } },
            select: { id: true, name: true },
        });
        const marketNameById = Object.fromEntries(markets.map((m) => [m.id, m.name]));

        const keyToCount = new Map<string, number>();
        const keyToPath = new Map<string, string>();
        for (const p of products) {
            const last = p.prices[0];
            if (!last?.marketCategoryCode) continue;
            const marketName = marketNameById[last.marketId];
            if (!marketName) continue;
            const key = `${marketName}\t${last.marketCategoryCode}`;
            keyToCount.set(key, (keyToCount.get(key) || 0) + 1);
            if (last.marketCategoryPath && !keyToPath.has(key)) keyToPath.set(key, last.marketCategoryPath);
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
                marketCategoryName: keyToPath.get(key) ?? null,
                productCount,
                isManuel: manuelSet.has(key),
            };
        });

        return NextResponse.json(list);
    } catch (e) {
        console.error('GET /api/admin/pending-category-mappings', e);
        return NextResponse.json({ error: 'Failed to fetch pending mappings' }, { status: 500 });
    }
}
