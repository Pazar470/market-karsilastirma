/**
 * Tarama sonrası kategori senkronu: Mapping'teki kodları null ürünlere uygular,
 * isteğe bağlı ODS dosyasından (market + ürün adı) categoryId günceller.
 * Manuel/Mapping tablolarına dokunmaz; sadece Product güncellenir.
 */
import type { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export async function getRootCategoryName(prisma: PrismaClient, categoryId: string): Promise<string | null> {
    const all = await prisma.category.findMany({ select: { id: true, name: true, parentId: true } });
    const byId = new Map(all.map((c) => [c.id, c]));
    let cur = byId.get(categoryId);
    while (cur?.parentId) cur = byId.get(cur.parentId);
    return cur?.name ?? null;
}

/**
 * Mapping'te olan (market, kategori kodu) için hâlâ categoryId=null olan ürünleri
 * o mapping'in categoryId'si ile günceller.
 * @returns Güncellenen ürün sayısı
 */
export async function syncMappingToNullProducts(prisma: PrismaClient): Promise<number> {
    const mappings = await prisma.marketCategoryMapping.findMany({
        include: { category: { select: { id: true } } },
    });
    const markets = await prisma.market.findMany({
        where: { name: { in: [...new Set(mappings.map((m) => m.marketName))] } },
        select: { id: true, name: true },
    });
    const marketIdByName = Object.fromEntries(markets.map((m) => [m.name, m.id]));

    let totalUpdated = 0;
    for (const map of mappings) {
        const marketId = marketIdByName[map.marketName];
        if (!marketId) continue;

        const codeEmpty = map.marketCategoryCode === '' || map.marketCategoryCode === null;
        const priceWhere = codeEmpty
            ? { marketId, OR: [{ marketCategoryCode: null }, { marketCategoryCode: '' }] }
            : { marketId, marketCategoryCode: map.marketCategoryCode };

        const priceRows = await prisma.price.findMany({
            where: priceWhere,
            select: { productId: true },
            distinct: ['productId'],
        });
        const productIds = priceRows.map((r) => r.productId);
        if (productIds.length === 0) continue;

        const toUpdate = await prisma.product.findMany({
            where: { id: { in: productIds }, categoryId: null },
            select: { id: true },
        });
        if (toUpdate.length === 0) continue;

        const categoryId = map.categoryId;
        const anaName = await getRootCategoryName(prisma, categoryId);
        await prisma.product.updateMany({
            where: { id: { in: toUpdate.map((p) => p.id) } },
            data: { categoryId, category: anaName },
        });
        totalUpdated += toUpdate.length;
    }
    return totalUpdated;
}

// --- ODS / TSV helpers (applyOdsProductCategories) ---

/** Market adı için eşleşme anahtarı: "Sok" ve "Şok" aynı market (birleştirme sonrası tek isim). Export: verify, import, script'ler. */
export function marketKey(s: string): string {
    const lower = (s ?? '').trim().toLowerCase();
    if (lower === 'sok') return 'şok';
    return lower;
}

/** ODS dosyasını TSV metnine çevirir (Python + pandas + odfpy). Script'lerde kullanmak için export. */
export function readOdsAsTsv(odsPath: string): string {
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
        try {
            fs.unlinkSync(scriptPath);
            fs.unlinkSync(outPath);
        } catch (_) {}
        return content;
    } catch (e: unknown) {
        try {
            fs.unlinkSync(scriptPath);
            fs.unlinkSync(outPath);
        } catch (_) {}
        throw new Error('ODS okuma hatası (Python + pandas + odfpy gerekir): ' + (e instanceof Error ? e.message : String(e)));
    }
}

export function slugify(name: string): string {
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

/** Paylaşılan normalizasyon: virgül→nokta (1,5 L = 1.5 L), boşluk birleştirme. Export: verify script ile aynı kural. */
export function normalizeName(s: string): string {
    return (s ?? '')
        .trim()
        .toLowerCase()
        .replace(/,/g, '.')
        .replace(/\s+/g, ' ');
}

interface TsvRowRaw {
    market: string;
    marketCategoryCode: string;
    urunAdi: string;
    anaRaw: string;
    yaprakRaw: string;
    inceRaw: string;
    manuel: string;
    /** ODS'te 9. sütun (Ürün ID): doluysa eşleşme önce ID ile yapılır, isim değişse bile etkilenmez */
    productId?: string;
}

interface TsvRowResolved extends TsvRowRaw {
    ana: string;
    yaprakResolved: string | null;
    inceResolved: string | null;
    leafSlug: string;
}

export function parseTsv(content: string): TsvRowRaw[] {
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

export function resolveRows(rows: TsvRowRaw[]): TsvRowResolved[] {
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
            yKey !== null && yaprakHasRealInce.has(yKey) ? (r.inceRaw.trim() || 'Diğer') : null;
        const s1 = slugify(ana);
        const leafSlug =
            yaprakResolved === null
                ? s1
                : inceResolved === null
                  ? `${s1}-${slugify(yaprakResolved)}`
                  : `${s1}-${slugify(yaprakResolved)}-${slugify(inceResolved)}`;
        return { ...r, ana, yaprakResolved, inceResolved, leafSlug };
    });
}

/**
 * ODS/TSV'de yolu (leafSlug) geçerli olan satırların (market + ürün adı) anahtarlarını döner.
 * Doğrulama için: Admin'de (categoryId=null) olup bu sette olan ürünler ODS'de yolu olan ürünlerdir (olmamalı).
 * @returns Set of "marketKey\tnormalizeName(urunAdi)" — dosya yoksa boş set
 */
export async function getOdsProductKeysWithPath(
    prisma: PrismaClient,
    odsOrTsvPath?: string | null
): Promise<Set<string>> {
    const defaultPath = path.join(process.cwd(), 'docs', 'tum_urunler_manuel.ods');
    const filePath = path.resolve(process.cwd(), odsOrTsvPath ?? defaultPath);
    if (!fs.existsSync(filePath)) return new Set();

    let content: string;
    const isOds = filePath.toLowerCase().endsWith('.ods');
    try {
        content = isOds ? readOdsAsTsv(filePath) : fs.readFileSync(filePath, 'utf-8');
    } catch {
        return new Set();
    }
    const rawRows = parseTsv(content);
    const rows = resolveRows(rawRows);
    if (rows.length === 0) return new Set();

    const categories = await prisma.category.findMany({ select: { slug: true } });
    const slugSet = new Set(categories.map((c) => c.slug));
    const out = new Set<string>();
    for (const row of rows) {
        if (!slugSet.has(row.leafSlug)) continue;
        out.add(`${marketKey(row.market)}\t${normalizeName(row.urunAdi)}`);
    }
    return out;
}

/**
 * ODS/TSV'de yolu olan satırlarda 9. sütun (Ürün ID) doluysa bu ID'leri döner.
 * Doğrulama için: Admin'de kalan bir ürünün id'si bu setteyse ODS'te yolu var demektir (olmamalı).
 */
export async function getOdsProductIdsWithPath(
    prisma: PrismaClient,
    odsOrTsvPath?: string | null
): Promise<Set<string>> {
    const defaultPath = path.join(process.cwd(), 'docs', 'tum_urunler_manuel.ods');
    const filePath = path.resolve(process.cwd(), odsOrTsvPath ?? defaultPath);
    if (!fs.existsSync(filePath)) return new Set();
    let content: string;
    const isOds = filePath.toLowerCase().endsWith('.ods');
    try {
        content = isOds ? readOdsAsTsv(filePath) : fs.readFileSync(filePath, 'utf-8');
    } catch {
        return new Set();
    }
    const rawRows = parseTsv(content);
    const rows = resolveRows(rawRows);
    const categories = await prisma.category.findMany({ select: { slug: true } });
    const slugSet = new Set(categories.map((c) => c.slug));
    const out = new Set<string>();
    for (const row of rows) {
        if (!slugSet.has(row.leafSlug) || !row.productId) continue;
        out.add(row.productId);
    }
    return out;
}

/**
 * ODS veya TSV dosyasından (market + ürün adı) eşleşen Product'ların categoryId'sini günceller.
 * Dosya yoksa veya path verilmezse 0 döner; hata fırlatmaz.
 * @param odsOrTsvPath docs/tum_urunler_manuel.ods veya docs/export.tsv (opsiyonel)
 * @returns Güncellenen ürün sayısı
 */
export async function applyOdsProductCategories(
    prisma: PrismaClient,
    odsOrTsvPath?: string | null
): Promise<number> {
    const defaultPath = path.join(process.cwd(), 'docs', 'tum_urunler_manuel.ods');
    const filePath = path.resolve(process.cwd(), odsOrTsvPath ?? defaultPath);
    if (!fs.existsSync(filePath)) return 0;

    let content: string;
    const isOds = filePath.toLowerCase().endsWith('.ods');
    try {
        content = isOds ? readOdsAsTsv(filePath) : fs.readFileSync(filePath, 'utf-8');
    } catch {
        return 0;
    }

    const rawRows = parseTsv(content);
    const rows = resolveRows(rawRows);
    if (rows.length === 0) return 0;

    const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
    const slugToId = new Map(categories.map((c) => [c.slug, c.id]));

    const productByKey = new Map<string, string>();
    const byMarket = new Map<string, { normName: string; id: string }[]>();
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
        const markets = marketIds.length > 0
            ? await prisma.market.findMany({ where: { id: { in: marketIds } }, select: { id: true, name: true } })
            : [];
        const marketNameById = Object.fromEntries(markets.map((m) => [m.id, m.name]));
        for (const p of products) {
            validProductIds.add(p.id);
            const price = p.prices[0];
            if (!price) continue;
            const mName = marketNameById[price.marketId];
            if (!mName) continue;
            const mKey = marketKey(mName);
            const normName = normalizeName(p.name);
            const key = `${mKey}\t${normName}`;
            if (!productByKey.has(key)) productByKey.set(key, p.id);
            if (!byMarket.has(mKey)) byMarket.set(mKey, []);
            if (!byMarket.get(mKey)!.some((x) => x.normName === normName)) byMarket.get(mKey)!.push({ normName, id: p.id });
        }
        if (products.length < chunkSize) break;
        cursor = products[products.length - 1]?.id;
    } while (cursor);

    function stripPriceSuffix(s: string): string {
        return (s ?? '')
            .trim()
            .replace(/\d+[,.]?\d*\s*₺\s*$/i, '')
            .replace(/\s*\+\d+\s*win\s*para\s*kazan\s*$/i, '')
            .replace(/\s+$/g, '')
            .trim();
    }
    function fallbackProductId(market: string, urunAdi: string): string | undefined {
        const mKey = marketKey(market);
        const normOds = normalizeName(urunAdi);
        const normOdsNoPrice = normalizeName(stripPriceSuffix(urunAdi));
        const list = byMarket.get(mKey);
        if (!list || normOds.length < 5) return undefined;
        for (const { normName, id } of list) {
            if (normName === normOds) return id;
            const nameNoPrice = stripPriceSuffix(normName);
            if (nameNoPrice === normOdsNoPrice || nameNoPrice === normOds) return id;
            if (normName.length >= 10 && normOds.length >= 10 && (normName.includes(normOds) || normOds.includes(normName))) return id;
            if (nameNoPrice.length >= 10 && normOdsNoPrice.length >= 10 && (nameNoPrice.includes(normOdsNoPrice) || normOdsNoPrice.includes(nameNoPrice))) return id;
        }
        return undefined;
    }

    const toUpdate: { id: string; categoryId: string; category: string }[] = [];
    for (const row of rows) {
        let categoryId = slugToId.get(row.leafSlug);
        if (!categoryId && row.yaprakResolved) {
            const anaSlug = slugify(row.ana);
            const yaprakSlug = `${anaSlug}-${slugify(row.yaprakResolved)}`;
            categoryId = slugToId.get(yaprakSlug) ?? slugToId.get(anaSlug) ?? undefined;
        }
        if (!categoryId) continue;
        let productId: string | undefined;
        if (row.productId && validProductIds.has(row.productId)) {
            productId = row.productId;
        } else {
            const key = `${marketKey(row.market)}\t${normalizeName(row.urunAdi)}`;
            productId = productByKey.get(key) ?? fallbackProductId(row.market, row.urunAdi);
        }
        if (!productId) continue;
        toUpdate.push({ id: productId, categoryId, category: row.ana });
    }

    const rootNameCache = new Map<string, string>();
    const byCategory = new Map<string, string[]>();
    for (const { id, categoryId, category } of toUpdate) {
        let anaName = rootNameCache.get(categoryId);
        if (anaName === undefined) {
            anaName = (await getRootCategoryName(prisma, categoryId)) ?? category;
            rootNameCache.set(categoryId, anaName);
        }
        const key = `${categoryId}\t${anaName}`;
        if (!byCategory.has(key)) byCategory.set(key, []);
        byCategory.get(key)!.push(id);
    }

    for (const [key, ids] of byCategory) {
        const [categoryId, category] = key.split('\t');
        await prisma.product.updateMany({
            where: { id: { in: ids } },
            data: { categoryId, category },
        });
    }
    return toUpdate.length;
}
