import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const RECENT_HOURS = 28;

/** Kategorisi olmayan (categoryId=null) ve son 28 saatte en az bir fiyatı olan tüm ürünler. */
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
                name: true,
                marketKey: true,
                quantityAmount: true,
                quantityUnit: true,
                createdAt: true,
                updatedAt: true,
                prices: {
                    orderBy: { date: 'desc' },
                    take: 5,
                    select: {
                        date: true,
                        amount: true,
                        campaignAmount: true,
                        market: { select: { name: true } },
                    },
                },
            },
            take: 500,
        });

        const list = products.map((p) => ({
            id: p.id,
            name: p.name,
            marketKey: p.marketKey,
            quantityAmount: p.quantityAmount,
            quantityUnit: p.quantityUnit,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            prices: p.prices.map((pr) => ({
                date: pr.date,
                marketName: pr.market.name,
                amount: Number(pr.campaignAmount ?? pr.amount),
            })),
        }));

        return NextResponse.json({
            serverTime: new Date().toISOString(),
            priceMinDate: priceMinDate.toISOString(),
            count: list.length,
            products: list,
        });
    } catch (e) {
        console.error('GET /api/admin/debug-uncategorized', e);
        return NextResponse.json(
            { error: String(e instanceof Error ? e.message : e) },
            { status: 500 },
        );
    }
}

