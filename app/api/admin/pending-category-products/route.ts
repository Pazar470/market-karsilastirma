import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** Belirli (market, kategori kodu) için ürün listesi: detay açılır liste ve ürün bazında atama için.
 * Son 48 saatte fiyatı olan ürünler (pending-category-mappings ile aynı pencere). marketCategoryCode boş = kodsuz satır. */
const RECENT_HOURS = 48;

export async function GET(request: Request) {
    const unauth = await requireAdmin();
    if (unauth) return unauth;
    const { searchParams } = new URL(request.url);
    const marketName = searchParams.get('marketName');
    const marketCategoryCode = searchParams.get('marketCategoryCode');
    if (!marketName) {
        return NextResponse.json({ error: 'marketName gerekli' }, { status: 400 });
    }
    try {
        const market = await prisma.market.findFirst({
            where: { name: marketName },
            select: { id: true },
        });
        if (!market) return NextResponse.json({ error: 'Market bulunamadı' }, { status: 404 });

        const priceMinDate = new Date();
        priceMinDate.setHours(priceMinDate.getHours() - RECENT_HOURS, 0, 0, 0);

        const codeEmpty = marketCategoryCode === null || marketCategoryCode === '';

        let productIds: string[];
        if (codeEmpty) {
            const priceRows = await prisma.price.findMany({
                where: {
                    marketId: market.id,
                    date: { gte: priceMinDate },
                    OR: [{ marketCategoryCode: null }, { marketCategoryCode: '' }],
                },
                orderBy: { date: 'desc' },
                select: { productId: true },
            });
            productIds = [...new Set(priceRows.map((r) => r.productId))];
        } else {
            const priceRows = await prisma.price.findMany({
                where: { marketId: market.id, marketCategoryCode, date: { gte: priceMinDate } },
                orderBy: { date: 'desc' },
                select: { productId: true },
            });
            productIds = [...new Set(priceRows.map((r) => r.productId))];
        }

        if (productIds.length === 0) return NextResponse.json({ products: [] });

        const products = await prisma.product.findMany({
            where: {
                id: { in: productIds },
                categoryId: null,
                prices: { some: { date: { gte: priceMinDate } } },
            },
            select: { id: true, name: true, categoryId: true },
        });

        return NextResponse.json({
            products: products.map((p) => ({ id: p.id, name: p.name, categoryId: p.categoryId })),
        });
    } catch (e) {
        console.error('GET /api/admin/pending-category-products', e);
        return NextResponse.json({ error: 'Ürün listesi alınamadı' }, { status: 500 });
    }
}
