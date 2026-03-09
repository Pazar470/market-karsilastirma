/**
 * Sadece MarketCategoryManuel ve MarketCategoryMapping yazar; Category ağacı ve Product güncellemesi yapmaz.
 * Tam import yavaşsa bu script ile Mapping/Manuel'i hızlıca doldur.
 * Kullanım: npx tsx scripts/import-only-mapping-manuel.ts "docs/tum_urunler_manuel_with_ids.tsv"
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { normalizeName, marketKey } from '../lib/category-sync';

const prisma = new PrismaClient();

function slugify(name: string): string {
    return name
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
        .replace(/^-|-$/g, '') || 'diger';
}

async function main() {
    const fileArg = process.argv[2] || path.join(process.cwd(), 'docs', 'tum_urunler_manuel_with_ids.tsv');
    const filePath = path.resolve(process.cwd(), fileArg);
    if (!fs.existsSync(filePath)) {
        console.error('Dosya bulunamadı:', filePath);
        process.exit(1);
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
        console.error('En az başlık + 1 satır gerekli.');
        process.exit(1);
    }

    const rows: { market: string; marketCategoryCode: string; anaRaw: string; yaprakRaw: string; inceRaw: string; manuel: string }[] = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('\t');
        if (parts.length < 8) continue;
        rows.push({
            market: (parts[0] ?? '').trim(),
            marketCategoryCode: (parts[1] ?? '').trim(),
            anaRaw: (parts[4] ?? '').trim(),
            yaprakRaw: (parts[5] ?? '').trim(),
            inceRaw: (parts[6] ?? '').trim(),
            manuel: (parts[7] ?? '').trim(),
        });
    }

    const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
    const slugToId = new Map(categories.map((c) => [c.slug, c.id]));

    const anaHasRealYaprak = new Set<string>();
    const yaprakHasRealInce = new Set<string>();
    for (const r of rows) {
        const ana = r.anaRaw.trim() || 'Diğer';
        if (r.yaprakRaw.trim() !== '') anaHasRealYaprak.add(ana);
        if (r.yaprakRaw.trim() !== '' && r.inceRaw.trim() !== '') {
            yaprakHasRealInce.add(`${ana}\t${r.yaprakRaw.trim()}`);
        }
    }
    const rowToLeafId = (r: typeof rows[0]): string | null => {
        const ana = r.anaRaw.trim() || 'Diğer';
        const yaprakResolved = anaHasRealYaprak.has(ana) ? (r.yaprakRaw.trim() || 'Diğer') : null;
        const yKey = yaprakResolved !== null ? `${ana}\t${yaprakResolved}` : null;
        const inceResolved =
            yKey !== null && yaprakHasRealInce.has(yKey) ? (r.inceRaw.trim() || 'Diğer') : null;
        const s1 = slugify(ana);
        const leafSlug =
            yaprakResolved === null
                ? s1
                : inceResolved === null
                  ? `${s1}-${slugify(yaprakResolved)}`
                  : `${s1}-${slugify(yaprakResolved)}-${slugify(inceResolved)}`;
        return slugToId.get(leafSlug) ?? null;
    };

    const manuelKeys = new Set<string>();
    for (const row of rows) {
        if (!(row.marketCategoryCode && row.market)) continue;
        if ((row.manuel ?? '').trim() === '') continue;
        manuelKeys.add(`${row.market}\t${row.marketCategoryCode}`);
    }
    await prisma.marketCategoryManuel.deleteMany({});
    for (const key of manuelKeys) {
        const [marketName, marketCategoryCode] = key.split('\t');
        await prisma.marketCategoryManuel.upsert({
            where: { marketName_marketCategoryCode: { marketName, marketCategoryCode } },
            update: {},
            create: { marketName, marketCategoryCode },
        });
    }
    console.log('Manuel (market+kod) sayısı:', manuelKeys.size);

    const seen = new Set<string>();
    const toMapping: { marketName: string; marketCategoryCode: string; categoryId: string }[] = [];
    for (const row of rows) {
        if (!(row.marketCategoryCode && row.market)) continue;
        const key = `${row.market}\t${row.marketCategoryCode}`;
        if (seen.has(key) || manuelKeys.has(key)) continue;
        seen.add(key);
        const leafId = rowToLeafId(row);
        if (!leafId) continue;
        toMapping.push({ marketName: row.market, marketCategoryCode: row.marketCategoryCode, categoryId: leafId });
    }
    const BATCH = 100;
    for (let i = 0; i < toMapping.length; i += BATCH) {
        const chunk = toMapping.slice(i, i + BATCH);
        await prisma.$transaction(
            chunk.map((m) =>
                prisma.marketCategoryMapping.upsert({
                    where: { marketName_marketCategoryCode: { marketName: m.marketName, marketCategoryCode: m.marketCategoryCode } },
                    update: { categoryId: m.categoryId, updatedAt: new Date() },
                    create: m,
                })
            )
        );
    }
    console.log('MarketCategoryMapping sayısı:', toMapping.length);
    console.log('Bitti.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
