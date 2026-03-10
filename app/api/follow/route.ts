import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUserSession } from '@/lib/user-session';

/** Kullanıcının takip ettiği ürünleri kategori bazlı listele (sadece takip edilen ürünü olan kategoriler). idsOnly=1 ise sadece productId listesi. */
export async function GET(request: Request) {
    const session = await requireUserSession();
    if (session instanceof Response) return session;
    const { searchParams } = new URL(request.url);
    const idsOnly = searchParams.get('idsOnly') === '1';
    try {
        if (idsOnly) {
            const rows = await prisma.userFollowedProduct.findMany({
                where: { userId: session.userId },
                select: { productId: true },
            });
            return NextResponse.json({ productIds: rows.map((r) => r.productId) });
        }
        const list = await prisma.userFollowedProduct.findMany({
            where: { userId: session.userId },
            include: {
                product: {
                    include: {
                        prices: {
                            include: { market: true },
                            orderBy: { date: 'desc' },
                            take: 1,
                        },
                        masterCategory: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const byCategory = new Map<string, { categoryId: string; categoryPath: string; products: typeof list }>();
        for (const row of list) {
            const catId = row.categoryId || row.product.categoryId || '';
            const key = catId || '__no_category__';
            if (!byCategory.has(key)) {
                let path = 'Kategorisiz';
                if (row.product.masterCategory?.name) path = row.product.masterCategory.name;
                else if (catId) {
                    const pathParts: string[] = [];
                    let currentId: string | null = catId;
                    const seen = new Set<string>();
                    while (currentId && !seen.has(currentId)) {
                        seen.add(currentId);
                        const c: { name: string | null; parentId: string | null } | null = await prisma.category.findUnique({
                            where: { id: currentId },
                            select: { name: true, parentId: true },
                        });
                        if (!c) break;
                        pathParts.unshift(c.name || 'Diğer');
                        currentId = c.parentId;
                    }
                    path = pathParts.join(' > ') || path;
                }
                byCategory.set(key, { categoryId: catId, categoryPath: path, products: [] });
            }
            byCategory.get(key)!.products.push(row);
        }
        const result = Array.from(byCategory.values()).map(({ categoryId, categoryPath, products }) => ({
            categoryId,
            categoryPath,
            products: products.map((p) => ({
                id: p.product.id,
                name: p.product.name,
                imageUrl: p.product.imageUrl,
                quantityAmount: p.product.quantityAmount,
                quantityUnit: p.product.quantityUnit,
                categoryId: p.product.categoryId,
                prices: p.product.prices,
                masterCategory: p.product.masterCategory,
            })),
        }));
        return NextResponse.json(result);
    } catch (error) {
        console.error('GET /api/follow', error);
        return NextResponse.json({ error: 'Liste alınamadı' }, { status: 500 });
    }
}

/** Takibe al: productId + isteğe bağlı categoryId (gruplama için). */
export async function POST(request: Request) {
    const session = await requireUserSession();
    if (session instanceof Response) return session;
    try {
        const body = await request.json();
        const { productId, categoryId } = body;
        if (!productId) return NextResponse.json({ error: 'productId gerekli' }, { status: 400 });
        await prisma.userFollowedProduct.upsert({
            where: {
                userId_productId: { userId: session.userId, productId },
            },
            create: { userId: session.userId, productId, categoryId: categoryId || null },
            update: { categoryId: categoryId ?? undefined },
        });
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('POST /api/follow', error);
        return NextResponse.json({ error: 'Eklenemedi' }, { status: 500 });
    }
}

/** Takibi bırak: productId query. */
export async function DELETE(request: Request) {
    const session = await requireUserSession();
    if (session instanceof Response) return session;
    try {
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId');
        if (!productId) return NextResponse.json({ error: 'productId gerekli' }, { status: 400 });
        await prisma.userFollowedProduct.deleteMany({
            where: { userId: session.userId, productId },
        });
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('DELETE /api/follow', error);
        return NextResponse.json({ error: 'Kaldırılamadı' }, { status: 500 });
    }
}
