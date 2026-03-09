/**
 * Admin'de (categoryId=null) kalan ve ODS'de yolu olan ürünleri TSV'de (market+ad) ile eşleştirip
 * kategori atayarak günceller. verify sonrası 0'a indirmek için.
 * Çalıştırma: npx tsx scripts/fix-remaining-null-by-ids.ts "docs/tum_urunler_manuel_with_ids.tsv"
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import {
    parseTsv,
    resolveRows,
    slugify,
    getRootCategoryName,
    marketKey,
    normalizeName,
} from '../lib/category-sync';

const prisma = new PrismaClient();

async function main() {
    const tsvPath = process.argv[2] || path.join(process.cwd(), 'docs', 'tum_urunler_manuel_with_ids.tsv');
    const filePath = path.resolve(process.cwd(), tsvPath);
    if (!fs.existsSync(filePath)) {
        console.error('TSV bulunamadı:', filePath);
        process.exit(1);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const rawRows = parseTsv(content);
    const rows = resolveRows(rawRows);

    const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
    const slugToId = new Map(categories.map((c) => [c.slug, c.id]));

    /** ODS/TSV ana adı -> DB slug (seed ile uyumlu) */
    const anaToSlug: Record<string, string> = {
        'Et, Tavuk & Balık': 'et-tavuk-sarkuteri',
        'Et, Tavuk & Şarküteri': 'et-tavuk-sarkuteri',
        'Süt Ürünleri': 'sut-kahvaltilik',
        'Süt & Kahvaltılık': 'sut-kahvaltilik',
        'Temel Gıda': 'temel-gida',
    };

    function getCategoryId(row: (typeof rows)[0]): string | undefined {
        let categoryId = slugToId.get(row.leafSlug);
        if (!categoryId && row.yaprakResolved) {
            const anaSlug = slugify(row.ana);
            const yaprakSlug = `${anaSlug}-${slugify(row.yaprakResolved)}`;
            categoryId = slugToId.get(yaprakSlug) ?? slugToId.get(anaSlug) ?? undefined;
        }
        if (!categoryId) {
            const fallbackSlug = anaToSlug[row.ana];
            if (fallbackSlug) categoryId = slugToId.get(fallbackSlug) ?? undefined;
        }
        return categoryId ?? undefined;
    }

    const keyToRow = new Map<string, (typeof rows)[0]>();
    for (const row of rows) {
        const key = `${marketKey(row.market)}\t${normalizeName(row.urunAdi)}`;
        if (!keyToRow.has(key)) keyToRow.set(key, row);
    }

    const nullProducts = await prisma.product.findMany({
        where: { categoryId: null },
        select: {
            id: true,
            name: true,
            prices: { orderBy: { date: 'desc' }, take: 1, select: { marketId: true } },
        },
    });

    const markets = await prisma.market.findMany({
        where: { id: { in: [...new Set(nullProducts.flatMap((p) => (p.prices[0] ? [p.prices[0].marketId] : [])))] } },
        select: { id: true, name: true },
    });
    const marketNameById = Object.fromEntries(markets.map((m) => [m.id, m.name]));

    let updated = 0;
    const rootNameCache = new Map<string, string>();

    for (const p of nullProducts) {
        const marketId = p.prices[0]?.marketId;
        const marketName = marketId ? marketNameById[marketId] : null;
        if (!marketName) continue;
        const key = `${marketKey(marketName)}\t${normalizeName(p.name)}`;
        const row = keyToRow.get(key);
        if (!row) continue;

        const categoryId = getCategoryId(row);
        if (!categoryId) continue;

        let rootName = rootNameCache.get(categoryId);
        if (rootName === undefined) {
            rootName = (await getRootCategoryName(prisma, categoryId)) ?? row.ana;
            rootNameCache.set(categoryId, rootName);
        }

        await prisma.product.update({
            where: { id: p.id },
            data: { categoryId, category: rootName },
        });
        updated++;
        console.log('Güncellendi:', p.name.substring(0, 50), '->', row.ana);
    }

    console.log('Bitti. Güncellenen:', updated);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
