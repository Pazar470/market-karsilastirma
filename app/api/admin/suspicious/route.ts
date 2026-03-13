import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** Şüpheli (isSuspicious=true) ürünleri listele. Admin panelinde gösterilir; kullanıcıya gösterilmez. */
export async function GET() {
    const unauth = await requireAdmin();
    if (unauth) return unauth;
    try {
        const products = await prisma.product.findMany({
            where: { isSuspicious: true },
            select: {
                id: true,
                name: true,
                quantityAmount: true,
                quantityUnit: true,
                masterCategory: { select: { name: true, slug: true } },
                prices: {
                    where: { market: { name: 'A101' } },
                    orderBy: { date: 'desc' },
                    take: 1,
                    select: { amount: true, campaignAmount: true, date: true },
                },
            },
        });
        const list = products.map((p) => {
            const price = p.prices[0];
            const amount = price
                ? Number(price.campaignAmount ?? price.amount)
                : null;
            const unitPrice =
                amount != null && p.quantityAmount && p.quantityAmount > 0
                    ? amount / p.quantityAmount
                    : null;
            return {
                id: p.id,
                name: p.name,
                categoryName: p.masterCategory?.name ?? null,
                categorySlug: p.masterCategory?.slug ?? null,
                quantityAmount: p.quantityAmount,
                quantityUnit: p.quantityUnit,
                price: amount,
                unitPrice,
                lastPriceDate: price?.date ?? null,
            };
        });
        return NextResponse.json(list);
    } catch (e) {
        console.error('GET /api/admin/suspicious:', e);
        return NextResponse.json(
            { error: e instanceof Error ? e.message : 'Sunucu hatası' },
            { status: 500 }
        );
    }
}

/** Ürünü şüpheden çıkar: isSuspicious = false → kullanıcıya gösterilir. */
export async function PATCH(request: Request) {
    const unauth = await requireAdmin();
    if (unauth) return unauth;
    let body: { productId?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 });
    }
    const productId = body?.productId;
    if (!productId || typeof productId !== 'string') {
        return NextResponse.json({ error: 'productId gerekli' }, { status: 400 });
    }
    try {
        await prisma.product.update({
            where: { id: productId },
            data: { isSuspicious: false },
        });
        return NextResponse.json({ success: true });
    } catch (e) {
        if ((e as { code?: string })?.code === 'P2025') {
            return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 });
        }
        console.error('PATCH /api/admin/suspicious:', e);
        return NextResponse.json(
            { error: e instanceof Error ? e.message : 'Güncelleme hatası' },
            { status: 500 }
        );
    }
}
