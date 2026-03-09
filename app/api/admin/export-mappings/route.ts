import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const HEADER =
    'Market\tMarket Kategori Kodu\tMarket Kategori (yol)\tÜrün Adı\tAna Kategori\tYaprak Kategori\tİnce Yaprak Kategori';

function pathFromLeafToRoot(
    categoryId: string,
    byId: Map<string, { id: string; name: string; parentId: string | null }>
): string[] {
    const path: string[] = [];
    let cur: { id: string; name: string; parentId: string | null } | undefined = byId.get(categoryId);
    while (cur) {
        path.push(cur.name);
        cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return path.reverse();
}

function tsvEscape(val: string): string {
    if (/[\t\n\r]/.test(val)) return `"${val.replace(/"/g, '""')}"`;
    return val;
}

/** Tüm eşlemeleri ODS/Excel uyumlu TSV olarak döndürür (yedek için). */
export async function GET() {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    const mappings = await prisma.marketCategoryMapping.findMany({
        orderBy: [{ marketName: 'asc' }, { marketCategoryCode: 'asc' }],
        include: { category: { select: { id: true, name: true, parentId: true } } },
    });
    const allCategories = await prisma.category.findMany({
        select: { id: true, name: true, parentId: true },
    });
    const byId = new Map(allCategories.map((c) => [c.id, c]));

    const lines: string[] = [HEADER];
    for (const m of mappings) {
        const pathArr = pathFromLeafToRoot(m.categoryId, byId);
        const ana = pathArr[0] ?? '';
        const yaprak = pathArr.length >= 2 ? pathArr[1] : ana;
        const ince = pathArr[pathArr.length - 1] ?? '';
        lines.push(
            [m.marketName, m.marketCategoryCode, '', '', ana, yaprak, ince].map(tsvEscape).join('\t')
        );
    }
    const tsv = lines.join('\n') + '\n';

    return new NextResponse(tsv, {
        headers: {
            'Content-Type': 'text/tab-separated-values; charset=utf-8',
            'Content-Disposition': `attachment; filename="kategori-eslemeleri-${new Date().toISOString().slice(0, 10)}.tsv"`,
        },
    });
}
