import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** (market, kategori kodu) çiftini manuel listesine ekle: bu koddan gelen ürünler ürün bazında atanacak, yeniler admin onayına düşecek. */
export async function POST(request: Request) {
    const unauth = await requireAdmin();
    if (unauth) return unauth;
    try {
        const body = await request.json();
        const { marketName, marketCategoryCode } = body as { marketName?: string; marketCategoryCode?: string };
        if (!marketName || !marketCategoryCode) {
            return NextResponse.json(
                { error: 'marketName ve marketCategoryCode gerekli' },
                { status: 400 }
            );
        }
        await prisma.marketCategoryManuel.upsert({
            where: {
                marketName_marketCategoryCode: { marketName, marketCategoryCode },
            },
            update: {},
            create: { marketName, marketCategoryCode },
        });
        return NextResponse.json({
            success: true,
            message: 'Manuel listesine eklendi. Bu kategorideki ürünlere tek tek yol atayabilirsin; yeni ürünler admin onayına düşer.',
        });
    } catch (e) {
        console.error('POST /api/admin/category-manuel', e);
        return NextResponse.json({ error: 'Eklenemedi' }, { status: 500 });
    }
}

/** (market, kategori kodu) çiftini manuel listesinden çıkar: bu kategori artık otomatik (ODS) yoluna düşer. */
export async function DELETE(request: Request) {
    const unauth = await requireAdmin();
    if (unauth) return unauth;
    try {
        const { searchParams } = new URL(request.url);
        const marketName = searchParams.get('marketName');
        const marketCategoryCode = searchParams.get('marketCategoryCode');
        if (!marketName || !marketCategoryCode) {
            return NextResponse.json(
                { error: 'marketName ve marketCategoryCode gerekli (query parametre)' },
                { status: 400 }
            );
        }
        await prisma.marketCategoryManuel.delete({
            where: {
                marketName_marketCategoryCode: { marketName, marketCategoryCode },
            },
        });
        return NextResponse.json({
            success: true,
            message: 'Manuel listesinden çıkarıldı. Bu kategori artık otomatik atanacak.',
        });
    } catch (e: unknown) {
        if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2025') {
            return NextResponse.json({ error: 'Kayıt bulunamadı (zaten manuel değil)' }, { status: 404 });
        }
        console.error('DELETE /api/admin/category-manuel', e);
        return NextResponse.json({ error: 'Kaldırılamadı' }, { status: 500 });
    }
}
