import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db';

async function getCategoryTree() {
    const all = await prisma.category.findMany({
        orderBy: { name: 'asc' },
        include: { children: true },
    });
    if (all.length === 0) return null;
    const byId = new Map(all.map((c) => [c.id, { ...c, children: [] as typeof all }]));
    const roots: typeof all = [];
    for (const c of all) {
        const node = byId.get(c.id)!;
        const name = (c.name && c.name.trim()) ? c.name : 'Diğer';
        (node as any).name = name;
        if (!c.parentId) roots.push(node);
        else {
            const parent = byId.get(c.parentId);
            if (parent) (parent as any).children.push(node);
            else roots.push(node);
        }
    }
    const sortByName = (arr: any[]) => {
        arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        arr.forEach((n) => n.children?.length && sortByName(n.children));
    };
    sortByName(roots);
    return roots;
}

/** Ana > Yaprak > İnce ağacı. Boş name "Diğer" olarak döner. 60 sn sunucu önbelleği. */
export async function GET() {
    try {
        const roots = await unstable_cache(getCategoryTree, ['categories-tree'], { revalidate: 60 })();
        if (roots === null) {
            return NextResponse.json(
                { error: 'Category tablosu boş veya RLS engelliyor. Supabase → Category → RLS politikalarını kontrol edin. ODS import: npx tsx scripts/clean-and-import-ods.ts' },
                { status: 503 }
            );
        }
        return NextResponse.json(roots, {
            headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate' },
        });
    } catch (e) {
        console.error('GET /api/categories/tree', e);
        const msg = e instanceof Error ? e.message : String(e);
        const isConnection = /connect|timeout|pool|ECONNREFUSED|MaxClients/i.test(msg);
        return NextResponse.json(
            {
                error: isConnection
                    ? 'Supabase bağlantı hatası (geçici). Birkaç saniye sonra yenileyin.'
                    : 'Kategori ağacı yüklenemedi. Category tablosu ve RLS kontrol edin.',
            },
            { status: 503 }
        );
    }
}
