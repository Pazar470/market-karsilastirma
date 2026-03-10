import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** Market + kategori kodu için kategori yolunu kaydet; ilgili ürünleri güncelle (ODS'e eklenmiş olur, sonraki taramada hortlamaz). */
export async function POST(request: Request) {
    const unauth = await requireAdmin();
    if (unauth) return unauth;
    try {
        const body = await request.json();
        const { marketName, marketCategoryCode, categoryId } = body as {
            marketName?: string;
            marketCategoryCode?: string;
            categoryId?: string;
        };
        if (!marketName || categoryId == null || categoryId === '') {
            return NextResponse.json(
                { error: 'marketName ve categoryId gerekli (marketCategoryCode boş bırakılabilir)' },
                { status: 400 }
            );
        }
        const code = marketCategoryCode == null ? '' : String(marketCategoryCode).trim();

        const category = await prisma.category.findUnique({
            where: { id: categoryId },
            select: { id: true, name: true, parentId: true },
        });
        if (!category) {
            return NextResponse.json({ error: 'Geçersiz categoryId' }, { status: 400 });
        }
        let anaName = category.name;
        if (category.parentId) {
            const all = await prisma.category.findMany({ select: { id: true, name: true, parentId: true } });
            const byId = new Map(all.map((c) => [c.id, c]));
            let cur: (typeof all)[0] | undefined = category as any;
            while (cur?.parentId) {
                cur = byId.get(cur.parentId);
            }
            if (cur) anaName = cur.name;
        }

        const market = await prisma.market.findFirst({
            where: { name: marketName },
            select: { id: true },
        });
        if (!market) {
            return NextResponse.json({ error: 'Market bulunamadı: ' + marketName }, { status: 400 });
        }

        await prisma.marketCategoryMapping.upsert({
            where: {
                marketName_marketCategoryCode: { marketName, marketCategoryCode: code },
            },
            update: { categoryId, updatedAt: new Date() },
            create: { marketName, marketCategoryCode: code, categoryId },
        });

        const priceWhere =
            code === ''
                ? { marketId: market.id, OR: [{ marketCategoryCode: null }, { marketCategoryCode: '' }] }
                : { marketId: market.id, marketCategoryCode: code };
        const productIds = await prisma.price.findMany({
            where: priceWhere,
            select: { productId: true },
            distinct: ['productId'],
        }).then((rows) => rows.map((r) => r.productId));

        if (productIds.length > 0) {
            await prisma.product.updateMany({
                where: { id: { in: productIds } },
                data: {
                    categoryId,
                    category: anaName,
                },
            });
        }

        return NextResponse.json({
            success: true,
            updatedProductCount: productIds.length,
            message: `Eşleme kaydedildi; ${productIds.length} ürün güncellendi. Sonraki taramada bu kod otomatik atanacak.`,
        });
    } catch (e) {
        console.error('POST /api/admin/category-mapping', e);
        return NextResponse.json({ error: 'Kayıt başarısız' }, { status: 500 });
    }
}
