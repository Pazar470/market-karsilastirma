/**
 * MarketCategoryMapping kayıtlarını ODS sütun sırasına uygun TSV olarak dışa aktarır.
 * Çıktıyı tum_urunler_manuel.ods içinde ilgili market/kod bloğunun en altına yapıştırabilirsin.
 * Manuel sütununu sen işaretlersin.
 *
 * Çalıştırma: npx tsx scripts/export-mappings-for-ods.ts [--recent]
 * --recent: Sadece son 7 günde güncellenen eşlemeler.
 */

import { PrismaClient } from '@prisma/client';
import * as path from 'path';

const prisma = new PrismaClient();

const ODS_HEADER = 'Market\tMarket Kategori Kodu\tMarket Kategori (yol)\tÜrün Adı\tAna Kategori\tYaprak Kategori\tİnce Yaprak Kategori\tManuel';

function pathFromLeafToRoot(
    categoryId: string,
    byId: Map<string, { id: string; name: string; parentId: string | null }>
): string[] {
    const path: string[] = [];
    let cur = byId.get(categoryId);
    while (cur) {
        path.push(cur.name);
        cur = cur.parentId ? byId.get(cur.parentId) ?? null : null;
    }
    return path.reverse(); // [ana, yaprak?, ince]
}

function tsvEscape(val: string): string {
    if (/[\t\n\r]/.test(val)) return `"${val.replace(/"/g, '""')}"`;
    return val;
}

async function main() {
    const recentOnly = process.argv.includes('--recent');
    const since = recentOnly ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : null;

    const mappings = await prisma.marketCategoryMapping.findMany({
        where: recentOnly && since ? { updatedAt: { gte: since } } : undefined,
        orderBy: { updatedAt: 'desc' },
        include: { category: { select: { id: true, name: true, parentId: true } } },
    });
    if (mappings.length === 0) {
        console.log('Dışa aktarılacak eşleme yok.');
        return;
    }

    const allCategories = await prisma.category.findMany({
        select: { id: true, name: true, parentId: true },
    });
    const byId = new Map(allCategories.map((c) => [c.id, c]));

    const lines: string[] = [ODS_HEADER];
    for (const m of mappings) {
        const pathArr = pathFromLeafToRoot(m.categoryId, byId);
        const ana = pathArr[0] ?? '';
        const yaprak = pathArr.length >= 2 ? pathArr[1] : ana;
        const ince = pathArr[pathArr.length - 1] ?? '';
        const marketCategoryPath = ''; // Opsiyonel: Price’tan alınabilir
        const urunAdi = '';
        const manuel = ''; // Kullanıcı doldurur
        lines.push(
            [
                m.marketName,
                m.marketCategoryCode,
                marketCategoryPath,
                urunAdi,
                ana,
                yaprak,
                ince,
                manuel,
            ]
                .map(tsvEscape)
                .join('\t')
        );
    }

    const outPath = path.join(process.cwd(), 'docs', 'ods_append_mappings.tsv');
    const fs = await import('fs');
    fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf-8');
    console.log(`${mappings.length} eşleme yazıldı: ${outPath}`);
    console.log('Bu dosyayı tum_urunler_manuel.ods içinde ilgili bölümün en altına yapıştırıp Manuel sütununu işaretleyebilirsin.');
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
