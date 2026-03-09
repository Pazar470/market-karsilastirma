import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** Slug üretir: Türkçe karakterleri ASCII'ye, boşlukları tireye çevirir. */
function slugify(name: string): string {
    const s = (name ?? '')
        .trim()
        .toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    return s || 'diger';
}

/** Yeni kategori ekler (Ana, Yaprak veya İnce yaprak). parentId null ise ana kategori. */
export async function POST(request: Request) {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    try {
        const body = await request.json();
        const { parentId = null, name } = body as { parentId?: string | null; name?: string };

        const trimmedName = (name ?? '').trim();
        if (!trimmedName) {
            return NextResponse.json({ error: 'Kategori adı gerekli' }, { status: 400 });
        }

        let baseSlug = slugify(trimmedName);
        if (!baseSlug) baseSlug = 'diger';

        let slug = baseSlug;
        let n = 1;
        while (await prisma.category.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${n}`;
            n++;
        }

        const category = await prisma.category.create({
            data: {
                name: trimmedName,
                slug,
                parentId: parentId || null,
            },
        });

        return NextResponse.json({ id: category.id, name: category.name, slug: category.slug });
    } catch (e) {
        console.error('POST /api/admin/categories', e);
        return NextResponse.json({ error: 'Kategori oluşturulamadı' }, { status: 500 });
    }
}
