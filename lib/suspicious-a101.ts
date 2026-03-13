'use server';

import { prisma } from '@/lib/db';

const A101_MARKET_NAME = 'A101';
const DAYS_NO_CHANGE = 7;
const THRESHOLD_RATIO = 0.8; // A101 birim fiyatı kategorideki en düşük birim fiyatın %80'inden küçükse şüpheli

function effectiveAmount(amount: { amount: unknown; campaignAmount: unknown }): number {
    const a = Number(amount.amount);
    const c = amount.campaignAmount != null ? Number(amount.campaignAmount) : null;
    return c != null && !Number.isNaN(c) ? c : a;
}

function unitPrice(priceAmount: number, quantityAmount: number | null): number {
    const q = quantityAmount != null && quantityAmount > 0 ? quantityAmount : 1;
    return priceAmount / q;
}

/**
 * A101 taraması sonrası çalıştırılır.
 * - Son 7 gündür fiyatı değişmeyen ve kategorideki en ucuz üründen en az %20 daha ucuz A101 ürünlerini şüpheli yapar.
 * - Son 7 günde farklı fiyat gelen A101 ürünlerini şüpheden çıkarır (otomatik onay).
 */
export async function runSuspiciousA101Check(): Promise<{ marked: number; cleared: number }> {
    const market = await prisma.market.findFirst({ where: { name: A101_MARKET_NAME }, select: { id: true } });
    if (!market) {
        console.warn('[suspicious-a101] A101 market bulunamadı, atlanıyor.');
        return { marked: 0, cleared: 0 };
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - DAYS_NO_CHANGE);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Son 7 gündeki tüm fiyatlar (ürün + kategori + miktar)
    const recentPrices = await prisma.price.findMany({
        where: { date: { gte: sevenDaysAgo } },
        select: {
            productId: true,
            marketId: true,
            date: true,
            amount: true,
            campaignAmount: true,
            product: { select: { categoryId: true, quantityAmount: true } },
        },
    });

    // Ürün bazında son 7 gündeki fiyatları grupla (tüm marketler)
    const byProduct = new Map<string, typeof recentPrices>();
    for (const row of recentPrices) {
        const list = byProduct.get(row.productId) || [];
        list.push(row);
        byProduct.set(row.productId, list);
    }

    // Kategori bazında referans birim fiyat:
    // - Her ürün için son 7 gündeki TÜM fiyatlardan min birim fiyatı al
    // - Kategori içinde bu ürün birim fiyatlarını medyana göre özetle
    const categoryUnitPrices = new Map<string, number[]>();
    for (const [, rows] of byProduct) {
        const product = rows[0]?.product;
        if (!product?.categoryId) continue;
        let minUp = Infinity;
        for (const r of rows) {
            const amt = effectiveAmount(r);
            const up = unitPrice(amt, product.quantityAmount);
            if (up < minUp) minUp = up;
        }
        if (minUp === Infinity) continue;
        const arr = categoryUnitPrices.get(product.categoryId) || [];
        arr.push(minUp);
        categoryUnitPrices.set(product.categoryId, arr);
    }

    const categoryBaselineUnitPrice = new Map<string, number>();
    for (const [categoryId, arr] of categoryUnitPrices) {
        if (!arr.length) continue;
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        categoryBaselineUnitPrice.set(categoryId, median);
    }

    // A101 fiyatları: son 7 gün, sadece A101
    const a101Prices = recentPrices.filter((r) => r.marketId === market.id);
    const a101ByProduct = new Map<string, typeof a101Prices>();
    for (const row of a101Prices) {
        const list = a101ByProduct.get(row.productId) || [];
        list.push(row);
        a101ByProduct.set(row.productId, list);
    }

    const toMark: string[] = [];
    const toClear: string[] = [];

    for (const [productId, rows] of a101ByProduct) {
        const product = rows[0]?.product;
        if (!product?.categoryId) continue;
        const distinctAmounts = new Set(rows.map((r) => effectiveAmount(r)));
        const baseline = categoryBaselineUnitPrice.get(product.categoryId);
        if (baseline == null || baseline <= 0) continue;

        if (distinctAmounts.size > 1) {
            // Son 7 günde farklı fiyat gelmiş → otomatik onay
            toClear.push(productId);
            continue;
        }

        const latest = rows.reduce((a, b) => (a.date >= b.date ? a : b));
        const amount = effectiveAmount(latest);
        const uPrice = unitPrice(amount, product.quantityAmount);
        if (uPrice < THRESHOLD_RATIO * baseline) {
            toMark.push(productId);
        } else {
            toClear.push(productId);
        }
    }

    let marked = 0;
    let cleared = 0;
    if (toMark.length > 0) {
        const res = await prisma.product.updateMany({
            where: { id: { in: toMark } },
            data: { isSuspicious: true },
        });
        marked = res.count;
    }
    if (toClear.length > 0) {
        const res = await prisma.product.updateMany({
            where: { id: { in: toClear } },
            data: { isSuspicious: false },
        });
        cleared = res.count;
    }

    if (marked > 0 || cleared > 0) {
        console.log(`[suspicious-a101] Şüpheli işaretlendi: ${marked}, şüpheden çıkarıldı: ${cleared}`);
    }
    return { marked, cleared };
}
