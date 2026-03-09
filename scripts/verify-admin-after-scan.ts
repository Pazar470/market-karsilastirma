/**
 * Tarama sonrası doğrulama: Admin'de (categoryId=null) olan ürünler arasında
 * ODS'de zaten yolu olan var mı? Olmamalı (bir kere ODS import sonrası bu ürünler maplenmiş olur).
 *
 * Çalıştırma: npx tsx scripts/verify-admin-after-scan.ts
 *            npx tsx scripts/verify-admin-after-scan.ts "docs/tum_urunler_manuel.ods"
 *
 * Çıktı: Admin'deki toplam null ürün, ODS'de yolu olup hâlâ null kalan (hatanın göstergesi), örnek liste.
 */
import 'dotenv/config';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { getOdsProductKeysWithPath, getOdsProductIdsWithPath, normalizeName, marketKey } from '../lib/category-sync';

const prisma = new PrismaClient();

async function main() {
    const odsPath = process.argv[2] || path.join(process.cwd(), 'docs', 'tum_urunler_manuel.ods');
    console.log('--- Tarama sonrası admin doğrulama ---\n');
    console.log('ODS dosyası:', path.resolve(process.cwd(), odsPath));

    const nullProducts = await prisma.product.findMany({
        where: { categoryId: null },
        select: {
            id: true,
            name: true,
            prices: {
                orderBy: { date: 'desc' },
                take: 1,
                select: { marketId: true, marketCategoryCode: true },
            },
        },
    });

    const marketIds = [...new Set(nullProducts.flatMap((p) => (p.prices[0] ? [p.prices[0].marketId] : [])))];
    const markets = await prisma.market.findMany({
        where: { id: { in: marketIds } },
        select: { id: true, name: true },
    });
    const marketNameById = Object.fromEntries(markets.map((m) => [m.id, m.name]));

    const manuelSet = new Set<string>();
    const manuelRows = await prisma.marketCategoryManuel.findMany({
        select: { marketName: true, marketCategoryCode: true },
    });
    for (const m of manuelRows) manuelSet.add(`${m.marketName}\t${m.marketCategoryCode}`);

    const [odsKeys, odsProductIds] = await Promise.all([
        getOdsProductKeysWithPath(prisma, odsPath),
        getOdsProductIdsWithPath(prisma, odsPath),
    ]);
    console.log('ODS\'de yolu olan (market+ürün adı) satır sayısı:', odsKeys.size);
    console.log('ODS\'de yolu olan (Ürün ID 9. sütun) sayısı:', odsProductIds.size);
    console.log('Manuel (market+kod) sayısı:', manuelSet.size, '— bunlardan gelen null ürünler admin\'de beklenir.');

    const inAdminButInOds: { id: string; name: string; market: string }[] = [];
    for (const p of nullProducts) {
        const last = p.prices[0];
        const marketName = last ? marketNameById[last.marketId] : null;
        const code = last?.marketCategoryCode ?? '';
        if (marketName && code && manuelSet.has(`${marketKey(marketName)}\t${code}`)) continue;
        if (odsProductIds.has(p.id)) {
            inAdminButInOds.push({ id: p.id, name: p.name, market: marketName ?? '?' });
            continue;
        }
        if (!last || !marketName) continue;
        const key = `${marketKey(marketName)}\t${normalizeName(p.name)}`;
        if (odsKeys.has(key)) inAdminButInOds.push({ id: p.id, name: p.name, market: marketName });
    }

    console.log('\n--- Sonuç ---');
    console.log('Admin\'de (categoryId=null) toplam ürün:', nullProducts.length);
    console.log('Bunlardan ODS\'de yolu olan (olmamalı):', inAdminButInOds.length);

    if (inAdminButInOds.length > 0) {
        console.log('\n⚠️ ODS\'de yolu olup admin\'de kalan örnekler (ilk 15):');
        inAdminButInOds.slice(0, 15).forEach((x, i) => {
            console.log(`  ${i + 1}. [${x.market}] ${x.name.substring(0, 50)}${x.name.length > 50 ? '…' : ''}`);
        });
        process.exitCode = 1;
    } else {
        console.log('\n✓ Admin\'de ODS yolu olan ürün yok (beklenen).');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
