/**
 * ODS ile DB'yi karşılaştırır: kaç satır eşleşiyor, kaç ürün iki kategoride, kaç eşleşmiyor.
 * Net sayılar verir; neden 26k değil de 17k gibi soruları yanıtlar.
 *
 * Kullanım: npx tsx scripts/diagnose-ods-vs-db.ts "docs/tum_urunler_manuel.ods"
 */
import 'dotenv/config';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { readOdsAsTsv, normalizeName } from '../lib/category-sync';

const prisma = new PrismaClient();

function marketKey(s: string): string {
    const lower = (s ?? '').trim().toLowerCase();
    if (lower === 'sok') return 'şok';
    return lower;
}

async function main() {
    const odsPath = process.argv[2] || path.join(process.cwd(), 'docs', 'tum_urunler_manuel.ods');
    const filePath = path.resolve(process.cwd(), odsPath);
    const fs = await import('fs');
    if (!fs.existsSync(filePath)) {
        console.error('Dosya bulunamadı:', filePath);
        process.exit(1);
    }

    console.log('--- ODS vs DB tanı ---\n');
    console.log('Kaynak:', filePath);

    const isOds = filePath.toLowerCase().endsWith('.ods');
    const content = isOds ? readOdsAsTsv(filePath) : fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    const dataLines = lines.slice(1);
    if (dataLines.length === 0) {
        console.log('ODS\'te veri satırı yok.');
        return;
    }

    const odsKeysByRow: string[] = [];
    const odsKeyToRowCount = new Map<string, number>();
    for (const line of dataLines) {
        const parts = line.split('\t');
        if (parts.length < 8) continue;
        const market = (parts[0] ?? '').trim();
        const urunAdi = (parts[3] ?? '').trim();
        const key = `${marketKey(market)}\t${normalizeName(urunAdi)}`;
        odsKeysByRow.push(key);
        odsKeyToRowCount.set(key, (odsKeyToRowCount.get(key) || 0) + 1);
    }

    const products = await prisma.product.findMany({
        include: {
            prices: {
                include: { market: true },
                orderBy: { date: 'desc' },
                take: 1,
            },
        },
    });
    const dbKeyToProductId = new Map<string, string>();
    for (const p of products) {
        const price = p.prices[0];
        if (!price) continue;
        const mName = (price.market as { name: string }).name;
        const key = `${marketKey(mName)}\t${normalizeName(p.name)}`;
        if (!dbKeyToProductId.has(key)) dbKeyToProductId.set(key, p.id);
    }

    const odsUniqueKeys = new Set(odsKeysByRow);
    const dbUniqueKeys = new Set(dbKeyToProductId.keys());

    let odsRowsMatched = 0;
    let odsRowsNoMatch = 0;
    const odsKeysWithNoDbSet = new Set<string>();
    for (const key of odsKeysByRow) {
        if (dbKeyToProductId.has(key)) odsRowsMatched++;
        else {
            odsRowsNoMatch++;
            odsKeysWithNoDbSet.add(key);
        }
    }
    const odsKeysWithNoDb = Array.from(odsKeysWithNoDbSet).slice(0, 20);

    const dbKeysWithNoOds: string[] = [];
    for (const key of dbUniqueKeys) {
        if (!odsUniqueKeys.has(key) && dbKeysWithNoOds.length < 20) dbKeysWithNoOds.push(key);
    }

    const duplicateKeyCount = Array.from(odsKeyToRowCount.entries()).filter(([, c]) => c > 1).length;
    const duplicateRowCount = Array.from(odsKeyToRowCount.values()).filter((c) => c > 1).reduce((a, c) => a + c - 1, 0);

    console.log('\n--- ODS ---');
    console.log('  Toplam satır:', dataLines.length);
    console.log('  Benzersiz (market + ürün adı):', odsUniqueKeys.size);
    console.log('  Aynı ürün birden fazla satırda (farklı kategori):', duplicateKeyCount, 'ürün → ekstra', duplicateRowCount, 'satır');

    console.log('\n--- DB (son fiyata göre market + ürün) ---');
    console.log('  Ürün sayısı (en az 1 fiyat):', products.length);
    console.log('  Benzersiz (market + ürün adı):', dbUniqueKeys.size);

    console.log('\n--- Eşleşme ---');
    console.log('  ODS satırı → DB\'de bulundu:', odsRowsMatched);
    console.log('  ODS satırı → DB\'de yok:', odsRowsNoMatch);
    if (odsKeysWithNoDb.length > 0) {
        console.log('\n  Örnek (ODS\'te var, DB\'de yok; ilk 10):');
        odsKeysWithNoDb.slice(0, 10).forEach((k) => console.log('   ', k.replace('\t', ' | ')));
    }
    if (dbKeysWithNoOds.length > 0) {
        console.log('\n  Örnek (DB\'de var, ODS\'te yok; ilk 10):');
        dbKeysWithNoOds.slice(0, 10).forEach((k) => console.log('   ', k.replace('\t', ' | ')));
    }

    console.log('\n--- Özet ---');
    console.log('  Eşleşen satır sayısı (write-ods-product-ids / apply-ods\'taki sayı):', odsRowsMatched);
    console.log('  Eşleşmeyen:', odsRowsNoMatch, '(ODS\'teki market+isim DB\'de yok veya isim farklı)');
    if (duplicateRowCount > 0) {
        console.log('  Aynı ürün iki kategoride:', duplicateKeyCount, 'ürün toplam', duplicateRowCount + duplicateKeyCount, 'satırda geçiyor.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
