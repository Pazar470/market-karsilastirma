import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/** Ana > Yaprak > İnce ağacı. Boş name "Diğer" olarak döner. */
export async function GET() {
    try {
        const all = await prisma.category.findMany({
            orderBy: { name: 'asc' },
            include: { children: true },
        });
        if (all.length === 0) {
            return NextResponse.json(
                { error: 'Category tablosu boş veya RLS engelliyor. Supabase → Category → RLS politikalarını kontrol edin.' },
                { status: 503 }
            );
        }
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
        return NextResponse.json(roots);
    } catch (e) {
        console.error('GET /api/categories/tree', e);
        return NextResponse.json({ error: 'Failed to fetch tree' }, { status: 500 });
    }
}
