/**
 * Kategori mapper doldurma için: Market + market kategori kodu + market kategori (marketten gelen)
 * + 4 boş sütun (Ana Kategori, Yaprak Kategori, İnce Yaprak Kategori, Manuel).
 * Bir satır = bir ürünün bir marketteki kaydı (aynı ürün 3 marketteyse 3 satır).
 *
 * Çalıştırma: npx ts-node --esm scripts/export-products-for-category-fill.ts
 * Çıktı: docs/URUN-LISTESI-KATEGORI-DOLDURMA.tsv
 *
 * Not: Market kategori kodu/path şu an sadece yeni taramalarda dolar. Mevcut veride boş olabilir.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function escapeTsv(val: string): string {
    return String(val ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
}

async function main() {
    const products = await prisma.product.findMany({
        where: { isSuspicious: false },
        include: {
            prices: {
                include: { market: true },
                orderBy: { date: 'desc' },
            },
        },
        orderBy: { name: 'asc' },
    });

    const headers = [
        'Market',
        'Market Kategori Kodu',
        'Market Kategori',
        'Ürün Adı',
        'Ana Kategori',
        'Yaprak Kategori',
        'İnce Yaprak Kategori',
        'Manuel',
    ];

    const rows: string[][] = [headers];

    for (const p of products) {
        const byMarket = new Map<string, typeof p.prices[0]>();
        for (const pr of p.prices) {
            if (!byMarket.has(pr.marketId)) byMarket.set(pr.marketId, pr);
        }
        for (const pr of byMarket.values()) {
            const marketName = pr.market.name;
            const code = (pr as any).marketCategoryCode ?? '';
            const pathFromMarket = (pr as any).marketCategoryPath ?? '';
            rows.push([
                escapeTsv(marketName),
                escapeTsv(code),
                escapeTsv(pathFromMarket),
                escapeTsv(p.name),
                '',
                '',
                '',
                '',
            ]);
        }
    }

    const tsv = rows.map(r => r.join('\t')).join('\n');
    const outPath = path.join(process.cwd(), 'docs', 'URUN-LISTESI-KATEGORI-DOLDURMA.tsv');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, '\uFEFF' + tsv, 'utf-8');
    console.log(`${rows.length - 1} satır (ürün×market) yazıldı: ${outPath}`);
}

main()
    .then(() => prisma.$disconnect())
    .catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
