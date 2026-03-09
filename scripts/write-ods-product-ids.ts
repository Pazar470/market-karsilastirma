/**
 * ODS dosyasını okur; her satır için sistemde (market + ürün adı) ile eşleşen ürünün ID'sini bulur
 * ve 9. sütuna yazar. Aynı ürün birden fazla satırda (farklı kategori) geçiyorsa her satırda aynı ID yazılır.
 * Eşleşmeyen satırlar için detaylı log: docs/ods-id-assignment-log.txt ve docs/ods-unmatched-keys.tsv
 *
 * Kullanım:
 *   npx tsx scripts/write-ods-product-ids.ts "docs/tum_urunler_manuel.ods"
 * Çıktı: docs/tum_urunler_manuel_with_ids.tsv
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { readOdsAsTsv, normalizeName } from '../lib/category-sync';

const prisma = new PrismaClient();

/** ODS ile aynı kural: Sok/Şok aynı market. */
function marketKey(s: string): string {
    const lower = (s ?? '').trim().toLowerCase();
    if (lower === 'sok') return 'şok';
    return lower;
}

async function main() {
    const odsPath = process.argv[2] || path.join(process.cwd(), 'docs', 'tum_urunler_manuel.ods');
    const filePath = path.resolve(process.cwd(), odsPath);
    if (!fs.existsSync(filePath)) {
        console.error('Dosya bulunamadı:', filePath);
        process.exit(1);
    }

    const isTsv = filePath.toLowerCase().endsWith('.tsv');
    console.log(isTsv ? 'TSV okunuyor:' : 'ODS okunuyor:', filePath);
    const content = isTsv ? fs.readFileSync(filePath, 'utf-8') : readOdsAsTsv(filePath);
    const lines = content.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
        console.error('En az başlık + 1 satır gerekli.');
        process.exit(1);
    }

    const header = lines[0];
    const dataLines = lines.slice(1);

    const productByKey = new Map<string, string>();
    const byMarket = new Map<string, { normName: string; id: string }[]>();
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

    /** Fiyat/ek sonekleri kaldır: "69,90₺", "+5 win Para Kazan" vb. */
    function stripPriceSuffix(s: string): string {
        return s
            .replace(/\d+[,.]?\d*\s*₺\s*$/i, '')
            .replace(/\s*\+\d+\s*win\s*para\s*kazan\s*$/i, '')
            .replace(/\s+$/g, '')
            .trim();
    }

    function fallbackId(market: string, urunAdi: string): string {
        const mKey = marketKey(market);
        const normOds = normalizeName(urunAdi);
        const normOdsNoPrice = normalizeName(stripPriceSuffix(urunAdi));
        const list = byMarket.get(mKey);
        if (!list || normOds.length < 5) return '';
        for (const { normName, id } of list) {
            if (normName === normOds) return id;
            const nameNoPrice = stripPriceSuffix(normName);
            if (nameNoPrice === normOdsNoPrice || nameNoPrice === normOds) return id;
            if (normName.length >= 10 && normOds.length >= 10) {
                if (normName.includes(normOds) || normOds.includes(normName)) return id;
            }
            if (nameNoPrice.length >= 10 && normOdsNoPrice.length >= 10) {
                if (nameNoPrice.includes(normOdsNoPrice) || normOdsNoPrice.includes(nameNoPrice)) return id;
            }
        }
        return '';
    }

    const hasIdColumn = header.includes('Ürün ID');
    let matched = 0;
    let fallbackMatched = 0;
    const unmatchedByKey = new Map<string, { market: string; urunAdi: string; rowCount: number }>();
    const outLines: string[] = [hasIdColumn ? header : header + '\tÜrün ID'];
    for (const line of dataLines) {
        const parts = line.split('\t');
        if (parts.length < 8) {
            outLines.push(parts.length >= 9 ? parts.slice(0, 9).join('\t') : line + '\t');
            continue;
        }
        const market = (parts[0] ?? '').trim();
        const urunAdi = (parts[3] ?? '').trim();
        const key = `${marketKey(market)}\t${normalizeName(urunAdi)}`;
        let productId = productByKey.get(key) ?? '';
        if (!productId) productId = fallbackId(market, urunAdi);
        if (productId) {
            matched++;
            if (!productByKey.has(key)) fallbackMatched++;
        } else {
            const prev = unmatchedByKey.get(key);
            if (!prev) unmatchedByKey.set(key, { market, urunAdi, rowCount: 1 });
            else prev.rowCount++;
        }
        const base = parts.slice(0, 8).join('\t');
        outLines.push(base + '\t' + productId);
    }

    const base = filePath.replace(/\.(ods|tsv)$/i, '');
    const outPath = base + (base.endsWith('_with_ids') ? '.tsv' : '_with_ids.tsv');
    fs.writeFileSync(outPath, outLines.join('\n'), 'utf-8');
    const unmatchedRows = dataLines.length - matched;
    const unmatchedKeys = unmatchedByKey.size;

    const logPath = path.join(process.cwd(), 'docs', 'ods-id-assignment-log.txt');
    const logLines: string[] = [
        'ODS Ürün ID atama logu',
        '========================',
        `Tarih: ${new Date().toISOString()}`,
        `Kaynak: ${filePath}`,
        '',
        'Özet',
        '-----',
        `Toplam satır: ${dataLines.length}`,
        `ID atanan satır: ${matched}${fallbackMatched > 0 ? ` (bunun ${fallbackMatched} adedi benzer isimle eşleşme)` : ''}`,
        `Eşleşmeyen satır: ${unmatchedRows}`,
        `Eşleşmeyen benzersiz (market+ürün adı): ${unmatchedKeys}`,
        '',
        'Eşleşmeme sebebi: ODS satırındaki (market + ürün adı) DB\'de yok.',
        '  - DB taramadaki ürün listesi ile ODS farklı olabilir.',
        '  - Market adı farkı (örn. Şok vs Sok) merge-duplicate-market ile giderildi mi kontrol et.',
        '  - Ürün adı yazım farkı (virgül/nokta, boşluk) normalizasyonla giderilmeye çalışılıyor.',
        '',
    ];
    const unmatchedByMarket = new Map<string, number>();
    for (const [, v] of unmatchedByKey) {
        unmatchedByMarket.set(v.market, (unmatchedByMarket.get(v.market) ?? 0) + v.rowCount);
    }
    logLines.push('Market bazında eşleşmeyen satır sayısı');
    logLines.push('--------------------------------------');
    for (const [m, count] of [...unmatchedByMarket.entries()].sort((a, b) => b[1] - a[1])) {
        logLines.push(`  ${m}: ${count}`);
    }
    logLines.push('');
    logLines.push('Örnek eşleşmeyen anahtarlar (ilk 80)');
    logLines.push('--------------------------------------');
    const samples = [...unmatchedByKey.entries()].slice(0, 80);
    for (const [key, v] of samples) {
        logLines.push(`  [${v.market}] ${v.urunAdi.substring(0, 60)}${v.urunAdi.length > 60 ? '…' : ''}  (${v.rowCount} satır)`);
    }
    fs.writeFileSync(logPath, logLines.join('\n'), 'utf-8');
    console.log('Log:', logPath);

    const unmatchedTsvPath = path.join(process.cwd(), 'docs', 'ods-unmatched-keys.tsv');
    const unmatchedTsvLines = ['Market\tÜrün Adı\tEşleşmeyen satır sayısı'];
    for (const [, v] of [...unmatchedByKey.entries()].sort((a, b) => b[1].rowCount - a[1].rowCount)) {
        unmatchedTsvLines.push(`${v.market}\t${v.urunAdi}\t${v.rowCount}`);
    }
    fs.writeFileSync(unmatchedTsvPath, unmatchedTsvLines.join('\n'), 'utf-8');
    console.log('Eşleşmeyen anahtarlar (TSV):', unmatchedTsvPath);

    console.log('Çıktı TSV:', outPath);
    console.log('Toplam satır:', dataLines.length, '| ID atanan:', matched, '(benzer isimle:', fallbackMatched + ')', '| Eşleşmeyen:', unmatchedRows);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
