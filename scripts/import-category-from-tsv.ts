/**
 * Manuel kategori TSV'yi okuyup: (1) Ana > Yaprak > İnce Category ağacı oluşturur,
 * (2) Her ürünü (market + ürün adı ile eşleştirip) ilgili leaf category'ye bağlar.
 *
 * Veri kaynağı: ODS (tum_urunler_manuel.ods) doldurduktan sonra LibreOffice'ten
 * "Farklı Kaydet → Metin CSV (.csv)" ile TSV olarak dışa aktarın (sütun ayırıcı: Sekme, UTF-8).
 * Sütun sırası: Market, Market Kategori Kodu, Market Kategori, Ürün Adı, Ana Kategori, Yaprak Kategori, İnce Yaprak Kategori, Manuel
 *
 * Çalıştırma:
 *   npx tsx scripts/import-category-from-tsv.ts                    # varsayılan TSV ile import
 *   npx tsx scripts/import-category-from-tsv.ts --check           # sadece istatistik (DB yazmaz)
 *   npx tsx scripts/import-category-from-tsv.ts dosya.tsv         # belirtilen dosyadan import
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { normalizeName, marketKey } from '../lib/category-sync';

const prisma = new PrismaClient();

const DEFAULT_TSV = path.join(process.cwd(), 'docs', 'URUN-LISTESI-KATEGORI-DOLDURMA.tsv');

/** ODS dosyasını Python (pandas+odfpy) ile TSV'ye çevirir; geçici dosyaya yazar (Windows stdout encoding sorununu önler). */
function readOdsAsTsv(odsPath: string): string {
    const abs = path.resolve(process.cwd(), odsPath);
    if (!fs.existsSync(abs)) throw new Error('ODS bulunamadı: ' + abs);
    const scriptPath = path.join(process.cwd(), 'scripts', '_read_ods.py');
    const outPath = path.join(process.cwd(), 'docs', '_ods_export_temp.tsv');
    const script = `import pandas as pd
df = pd.read_excel(r"${abs.replace(/\\/g, '\\\\')}", engine='odf')
df.to_csv(r"${outPath.replace(/\\/g, '\\\\')}", sep='\\t', index=False, encoding='utf-8')
`;
    fs.writeFileSync(scriptPath, script, 'utf-8');
    try {
        execSync(`py -3 "${scriptPath}"`, { maxBuffer: 50 * 1024 * 1024 });
        const content = fs.readFileSync(outPath, 'utf-8');
        try { fs.unlinkSync(scriptPath); fs.unlinkSync(outPath); } catch (_) {}
        return content;
    } catch (e: any) {
        try { fs.unlinkSync(scriptPath); fs.unlinkSync(outPath); } catch (_) {}
        throw new Error('ODS okuma hatası (Python + pandas + odfpy gerekir): ' + (e?.message || e));
    }
}

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

interface TsvRowRaw {
    market: string;
    marketCategoryCode: string;
    urunAdi: string;
    anaRaw: string;
    yaprakRaw: string;
    inceRaw: string;
    /** ODS Manuel sütunu (H): dolu = bu market+kod her zaman admin onayına gidecek */
    manuel: string;
    /** ODS 9. sütun (Ürün ID): doluysa eşleşme önce ID ile yapılır */
    productId?: string;
}

/** Çözümlenmiş yol: boş yaprak/ince sadece üst seviyede en az bir dolu varsa "Diğer"; hiç yoksa doğrudan üste bağlanır. Her "Diğer" kendi ana/yaprak altında benzersiz. */
interface TsvRowResolved extends TsvRowRaw {
    ana: string;
    yaprakResolved: string | null;
    inceResolved: string | null;
    leafSlug: string;
}

function parseTsv(content: string): TsvRowRaw[] {
    const lines = content.split(/\r?\n/).filter(Boolean);
    const rows: TsvRowRaw[] = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('\t');
        if (parts.length < 7) continue;
        const productId = parts.length > 8 ? (parts[8] ?? '').trim() : undefined;
        rows.push({
            market: (parts[0] ?? '').trim(),
            marketCategoryCode: (parts[1] ?? '').trim(),
            urunAdi: (parts[3] ?? '').trim(),
            anaRaw: (parts[4] ?? '').trim(),
            yaprakRaw: (parts[5] ?? '').trim(),
            inceRaw: (parts[6] ?? '').trim(),
            manuel: (parts[7] ?? '').trim(),
            ...(productId !== '' && productId !== undefined ? { productId } : {}),
        });
    }
    return rows;
}

function resolveRows(rows: TsvRowRaw[]): TsvRowResolved[] {
    const anaHasRealYaprak = new Set<string>();
    const yaprakHasRealInce = new Set<string>();
    for (const r of rows) {
        const ana = r.anaRaw.trim() || 'Diğer';
        if (r.yaprakRaw.trim() !== '') anaHasRealYaprak.add(ana);
        if (r.yaprakRaw.trim() !== '' && r.inceRaw.trim() !== '') {
            const yKey = `${ana}\t${r.yaprakRaw.trim()}`;
            yaprakHasRealInce.add(yKey);
        }
    }
    return rows.map((r) => {
        const ana = r.anaRaw.trim() || 'Diğer';
        const yaprakResolved: string | null = anaHasRealYaprak.has(ana)
            ? (r.yaprakRaw.trim() || 'Diğer')
            : null;
        const yKey = yaprakResolved !== null ? `${ana}\t${yaprakResolved}` : null;
        const inceResolved: string | null =
            yKey !== null && yaprakHasRealInce.has(yKey)
                ? (r.inceRaw.trim() || 'Diğer')
                : null;
        const s1 = slugify(ana);
        const leafSlug =
            yaprakResolved === null
                ? s1
                : inceResolved === null
                  ? `${s1}-${slugify(yaprakResolved)}`
                  : `${s1}-${slugify(yaprakResolved)}-${slugify(inceResolved)}`;
        return {
            ...r,
            ana,
            yaprakResolved,
            inceResolved,
            leafSlug,
        };
    });
}

/** Ham dosyadan dolu hücre sayılarını hesaplar; çözümlenmiş yollardan benzersiz leaf sayısı. */
function reportStats(content: string, rows: TsvRowResolved[]) {
    const lines = content.split(/\r?\n/).filter(Boolean);
    let anaDolu = 0, yaprakDolu = 0, inceDolu = 0;
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('\t');
        if (parts.length < 7) continue;
        if ((parts[4] ?? '').trim() !== '') anaDolu++;
        if ((parts[5] ?? '').trim() !== '') yaprakDolu++;
        if ((parts[6] ?? '').trim() !== '') inceDolu++;
    }
    const pathSet = new Set(rows.map((r) => r.leafSlug));
    const p = (n: number) => (rows.length ? ((n / rows.length) * 100).toFixed(1) : '0');
    console.log('--- Kontrol (binlerce yol / %90+ yaprak beklentisi) ---');
    console.log('Toplam satır (başlık hariç):', rows.length);
    console.log('Ana kategori dolu (ham):', anaDolu, `(%${p(anaDolu)})`);
    console.log('Yaprak kategori dolu (ham):', yaprakDolu, `(%${p(yaprakDolu)})`);
    console.log('İnce yaprak kategori dolu (ham):', inceDolu, `(%${p(inceDolu)})`);
    console.log('Benzersiz kategori yolu (çözümlenmiş):', pathSet.size);
    console.log('---');
}

async function main() {
    const args = process.argv.slice(2);
    const checkOnly = args.includes('--check');
    const fileArg = args.find((a) => a !== '--check' && !a.startsWith('-'));
    const TSV_PATH = fileArg ? path.resolve(process.cwd(), fileArg) : DEFAULT_TSV;

    const isOds = TSV_PATH.toLowerCase().endsWith('.ods');
    let content: string;
    if (isOds) {
        if (!fs.existsSync(TSV_PATH)) {
            console.error('ODS bulunamadı:', TSV_PATH);
            process.exit(1);
        }
        console.log('ODS okunuyor (Python pandas+odfpy)...');
        content = readOdsAsTsv(TSV_PATH);
    } else {
        if (!fs.existsSync(TSV_PATH)) {
            console.error('TSV bulunamadı:', TSV_PATH);
            console.error('ODS kullanıyorsanız: dosya yolu olarak .ods verin veya LibreOffice\'te Farklı Kaydet → Metin CSV (Sekme, UTF-8).');
            process.exit(1);
        }
        content = fs.readFileSync(TSV_PATH, 'utf-8');
    }
    const rawRows = parseTsv(content);
    const rows = resolveRows(rawRows);
    console.log('Dosya:', TSV_PATH);
    console.log('TSV satır sayısı (başlık hariç):', rows.length);

    reportStats(content, rows);
    if (checkOnly) {
        console.log('--check: Sadece istatistik gösterildi, veritabanına yazılmadı.');
        return;
    }

    // 1) Çözümlenmiş yollardan benzersiz leaf slug'ları
    const leafSlugs = [...new Set(rows.map((r) => r.leafSlug))];
    console.log('Benzersiz kategori yolu (leaf):', leafSlugs.length);

    // ODS'te olacak tüm slug'lar (tek mapping = sadece bunlar kalacak)
    const anaSlugsSet = new Set(rows.map((r) => slugify(r.ana)));
    const yaprakSlugsSet = new Set<string>();
    const inceSlugsSet = new Set<string>();
    for (const r of rows) {
        if (r.yaprakResolved !== null) {
            const s2 = `${slugify(r.ana)}-${slugify(r.yaprakResolved)}`;
            yaprakSlugsSet.add(s2);
        }
        if (r.inceResolved !== null) {
            const s3 = `${slugify(r.ana)}-${slugify(r.yaprakResolved!)}-${slugify(r.inceResolved)}`;
            inceSlugsSet.add(s3);
        }
    }
    const allowedSlugs = new Set<string>([...anaSlugsSet, ...yaprakSlugsSet, ...inceSlugsSet]);

    // Kısa adımlar (Supabase uzun transaction'ı kapatıyor; tek dev transaction kullanmıyoruz)
    // .env'de connection_limit=1 ile tek bağlantı kullanılır
    const slugToId = new Map<string, string>();
    const anaSlugs = [...anaSlugsSet];
    for (const s1 of anaSlugs) {
        const name = rows.find((r) => slugify(r.ana) === s1)!.ana;
        const c = await prisma.category.upsert({
            where: { slug: s1 },
            update: { name },
            create: { name, slug: s1, parentId: null },
        });
        slugToId.set(s1, c.id);
    }
    const yaprakEntries = new Map<string, { s1: string; name: string }>();
    for (const r of rows) {
        if (r.yaprakResolved === null) continue;
        const s1 = slugify(r.ana);
        const s2 = `${s1}-${slugify(r.yaprakResolved)}`;
        if (!yaprakEntries.has(s2)) yaprakEntries.set(s2, { s1, name: r.yaprakResolved });
    }
    for (const [s2, { s1, name }] of yaprakEntries) {
        const parentId = slugToId.get(s1);
        if (!parentId) continue;
        const c = await prisma.category.upsert({
            where: { slug: s2 },
            update: { name, parentId },
            create: { name, slug: s2, parentId },
        });
        slugToId.set(s2, c.id);
    }
    const inceEntries = new Map<string, { s2: string; name: string }>();
    for (const r of rows) {
        if (r.inceResolved === null) continue;
        const s2 = `${slugify(r.ana)}-${slugify(r.yaprakResolved!)}`;
        const s3 = `${s2}-${slugify(r.inceResolved)}`;
        if (!inceEntries.has(s3)) inceEntries.set(s3, { s2, name: r.inceResolved });
    }
    for (const [s3, { s2, name }] of inceEntries) {
        const parentId = slugToId.get(s2);
        if (!parentId) continue;
        const c = await prisma.category.upsert({
            where: { slug: s3 },
            update: { name, parentId },
            create: { name, slug: s3, parentId },
        });
        slugToId.set(s3, c.id);
    }
    console.log('Category node sayısı:', slugToId.size);

    const existing = await prisma.category.findMany({ select: { id: true, slug: true } });
    const toDelete = existing.filter((c) => !allowedSlugs.has(c.slug));
    if (toDelete.length > 0) {
        const toDeleteIds = toDelete.map((c) => c.id);
        const fallbackId = anaSlugs.length > 0 ? slugToId.get(anaSlugs[0])! : existing.find((c) => allowedSlugs.has(c.slug))?.id;
        if (fallbackId) {
            await prisma.smartAlarm.updateMany({
                where: { categoryId: { in: toDeleteIds } },
                data: { categoryId: fallbackId },
            });
        }
        await prisma.category.deleteMany({ where: { id: { in: toDeleteIds } } });
        console.log('ODS dışı kategoriler silindi:', toDelete.length);
    }

    const rowToLeafId = (r: TsvRowResolved): string => {
        const id = slugToId.get(r.leafSlug);
        if (!id) throw new Error(`Category bulunamadı: ${r.leafSlug}`);
        return id;
    };

    const productByKey = new Map<string, string>();
    const validProductIds = new Set<string>();
    const chunkSize = 3000;
    let cursor: string | undefined;
    do {
        const products = await prisma.product.findMany({
            take: chunkSize,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
            select: {
                id: true,
                name: true,
                prices: {
                    orderBy: { date: 'desc' },
                    take: 1,
                    select: { marketId: true },
                },
            },
        });
        const marketIds = [...new Set(products.flatMap((p) => (p.prices[0] ? [p.prices[0].marketId] : [])))];
        const markets =
            marketIds.length > 0
                ? await prisma.market.findMany({ where: { id: { in: marketIds } }, select: { id: true, name: true } })
                : [];
        const marketNameById = Object.fromEntries(markets.map((m) => [m.id, m.name]));
        for (const p of products) {
            validProductIds.add(p.id);
            const price = p.prices[0];
            if (!price) continue;
            const mName = marketNameById[price.marketId];
            if (!mName) continue;
            const key = `${marketKey(mName)}\t${normalizeName(p.name)}`;
            if (!productByKey.has(key)) productByKey.set(key, p.id);
        }
        if (products.length < chunkSize) break;
        cursor = products[products.length - 1]?.id;
    } while (cursor);

    const manuelKeys = new Set<string>();
    for (const row of rows) {
        if (!(row.marketCategoryCode && row.market)) continue;
        if ((row.manuel ?? '').trim() === '') continue;
        manuelKeys.add(`${row.market}\t${row.marketCategoryCode}`);
    }

    const toUpdate: { id: string; categoryId: string; category: string }[] = [];
    let skipped = 0;
    for (const row of rows) {
        if (manuelKeys.has(`${row.market}\t${row.marketCategoryCode}`)) continue;
        const leafId = rowToLeafId(row);
        let productId: string | undefined;
        if (row.productId && validProductIds.has(row.productId)) {
            productId = row.productId;
        } else {
            const key = `${marketKey(row.market)}\t${normalizeName(row.urunAdi)}`;
            productId = productByKey.get(key);
        }
        if (!productId) {
            skipped++;
            continue;
        }
        toUpdate.push({ id: productId, categoryId: leafId, category: row.ana });
    }

    const BATCH = 500;
    for (let i = 0; i < toUpdate.length; i += BATCH) {
        const chunk = toUpdate.slice(i, i + BATCH);
        await prisma.$transaction(
            chunk.map(({ id, categoryId, category }) =>
                prisma.product.update({
                    where: { id },
                    data: { categoryId, category },
                })
            )
        );
        if ((i + BATCH) % 2000 === 0 || i + BATCH >= toUpdate.length) {
            console.log('  Ürün:', Math.min(i + BATCH, toUpdate.length), '/', toUpdate.length);
        }
    }
    console.log('Güncellenen ürün:', toUpdate.length, ', eşleşmeyen:', skipped);

    await prisma.marketCategoryManuel.deleteMany({});
    for (const key of manuelKeys) {
        const [marketName, marketCategoryCode] = key.split('\t');
        await prisma.marketCategoryManuel.upsert({
            where: {
                marketName_marketCategoryCode: { marketName, marketCategoryCode },
            },
            update: {},
            create: { marketName, marketCategoryCode },
        });
    }
    console.log('Manuel (market+kod) sayısı:', manuelKeys.size);

    const seen = new Set<string>();
    let mappingCount = 0;
    for (const row of rows) {
        if (!(row.marketCategoryCode && row.market)) continue;
        const key = `${row.market}\t${row.marketCategoryCode}`;
        if (seen.has(key) || manuelKeys.has(key)) continue;
        seen.add(key);
        mappingCount++;
        const leafId = rowToLeafId(row);
        await prisma.marketCategoryMapping.upsert({
            where: {
                marketName_marketCategoryCode: {
                    marketName: row.market,
                    marketCategoryCode: row.marketCategoryCode,
                },
            },
            update: { categoryId: leafId, updatedAt: new Date() },
            create: {
                marketName: row.market,
                marketCategoryCode: row.marketCategoryCode,
                categoryId: leafId,
            },
        });
    }
    console.log('MarketCategoryMapping sayısı:', mappingCount);
    console.log('Bitti.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
