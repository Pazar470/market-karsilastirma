import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** Belirli (market, kategori kodu) için ürün listesi: detay açılır liste ve ürün bazında atama için. */
export async function GET(request: Request) {
    const unauth = await requireAdmin();
    if (unauth) return unauth;
    const { searchParams } = new URL(request.url);
    const marketName = searchParams.get('marketName');
    const marketCategoryCode = searchParams.get('marketCategoryCode');
    if (!marketName || !marketCategoryCode) {
        return NextResponse.json({ error: 'marketName ve marketCategoryCode gerekli' }, { status: 400 });
    }
    try {
        const market = await prisma.market.findFirst({
            where: { name: marketName },
            select: { id: true },
        });
        if (!market) return NextResponse.json({ error: 'Market bulunamadı' }, { status: 404 });

        const priceRows = await prisma.price.findMany({
            where: { marketId: market.id, marketCategoryCode },
            orderBy: { date: 'desc' },
            select: { productId: true },
        });
        const productIds = [...new Set(priceRows.map((r) => r.productId))];
        if (productIds.length === 0) return NextResponse.json({ products: [] });

        // Sadece henüz yolu atanmamış ürünler: bir kez yol verilmişse bir daha admin listesinde görünmez.
        const products = await prisma.product.findMany({
            where: { id: { in: productIds }, categoryId: null },
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
