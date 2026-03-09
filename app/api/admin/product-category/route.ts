import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

async function getRootCategoryName(categoryId: string): Promise<string | null> {
    const all = await prisma.category.findMany({ select: { id: true, name: true, parentId: true } });
    const byId = new Map(all.map((c) => [c.id, c]));
    let cur = byId.get(categoryId);
    while (cur?.parentId) cur = byId.get(cur.parentId) ?? null;
    return cur?.name ?? null;
}

/** Tek ürünün kategori yolunu güncelle (manuel kodlarda ürün bazında atama için). */
export async function POST(request: Request) {
    const unauth = await requireAdmin();
    if (unauth) return unauth;
    try {
        const body = await request.json();
        const { productId, categoryId } = body as { productId?: string; categoryId?: string };
        if (!productId || !categoryId) {
            return NextResponse.json({ error: 'productId ve categoryId gerekli' }, { status: 400 });
        }
        const category = await prisma.category.findUnique({
            where: { id: categoryId },
            select: { id: true },
        });
        if (!category) return NextResponse.json({ error: 'Geçersiz categoryId' }, { status: 400 });
        const anaName = await getRootCategoryName(categoryId);
        await prisma.product.update({
            where: { id: productId },
            data: { categoryId, category: anaName },
        });
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('POST /api/admin/product-category', e);
        return NextResponse.json({ error: 'Güncellenemedi' }, { status: 500 });
    }
}
