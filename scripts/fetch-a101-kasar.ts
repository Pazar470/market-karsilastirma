import fetch from 'node-fetch';
import { PrismaClient } from '@prisma/client';
import { getMappedCategory } from '../lib/category-mapper.ts';

const prisma = new PrismaClient();

// C05 = Süt & Kahvaltılık (Parent Category)
// C0512 = Kaşar Peyniri (Target Subcategory)
const CATEGORY_ID_PARENT = 'C05';
const CATEGORY_ID_TARGET = 'C0512';
const STORE_ID = 'VS032';

/**
 * Product name içerisinden gramaj ve birimi ayıklar.
 */
function parseQuantity(name: string): { amount: number | null, unit: string | null } {
    const lowerName = name.toLowerCase();
    // Pattern for numbers followed by optional unit
    const regex = /(\d+([.,]\d+)?)\s*(kg|g|gr|l|ml|mlt|ad|adet)?\b/i;
    const match = lowerName.match(regex);

    if (match) {
        let amount = parseFloat(match[1].replace(',', '.'));
        let unit = match[3] ? match[3].toLowerCase() : null;

        // RULE: If no unit is specified but number is > 10, assume Grams
        // BUT check for counting suffixes like "li", "lu", "dilim" to avoid (e.g. "Kürdan 50'li")
        if (!unit && amount > 10) {
            const matchIndex = match.index || 0;
            const matchLength = match[0].length;
            const textAfter = lowerName.slice(matchIndex + matchLength).trim();
            const countSuffixes = ['li', 'lu', 'lü', 'lı', "'li", "'lu", "'lü", "'lı", "-li", "-lu", "-lü", "-lı", "dilim", "adet"];

            const isCount = countSuffixes.some(s => textAfter.startsWith(s));
            if (isCount) {
                return { amount: null, unit: null };
            }
            unit = 'g';
        }

        if (unit === 'g' || unit === 'gr') {
            amount = amount / 1000;
            unit = 'kg';
        } else if (unit === 'ml' || unit === 'mlt') {
            amount = amount / 1000;
            unit = 'l';
        }
        return { amount, unit };
    }

    // Handle standalone "Kg" or "L"
    if (lowerName.endsWith(' kg')) {
        return { amount: 1, unit: 'kg' };
    }
    if (lowerName.endsWith(' l')) {
        return { amount: 1, unit: 'l' };
    }

    return { amount: null, unit: null };
}

async function fetchA101Kasar() {
    console.log(`Fetching A101 Category ${CATEGORY_ID_PARENT}...`);

    // Ensure Market exists
    let market = await prisma.market.findFirst({ where: { name: 'A101' } });
    if (!market) {
        market = await prisma.market.create({
            data: { name: 'A101', website: 'https://www.a101.com.tr' }
        });
        console.log('Created A101 market record.');
    }

    const url = `https://rio.a101.com.tr/dbmk89vnr/CALL/Store/getProductsByCategory/${STORE_ID}?id=${CATEGORY_ID_PARENT}&channel=SLOT&__culture=tr-TR&__platform=web&data=e30%3D&__isbase64=true`;

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://www.a101.com.tr',
                'Referer': 'https://www.a101.com.tr/'
            }
        });

        if (!res.ok) {
            console.error(`Failed to fetch A101 API: ${res.status}`);
            return;
        }

        const json: any = await res.json();
        const allProducts: any[] = [];

        // Collect all products
        if (json.data && Array.isArray(json.data)) allProducts.push(...json.data);
        if (json.children && Array.isArray(json.children)) {
            json.children.forEach((c: any) => {
                if (c.products) allProducts.push(...c.products);
            });
        }

        // Filter for C0512 (Kaşar Peyniri)
        const targetProducts = allProducts.filter(p => {
            if (!p.categories) return false;
            return p.categories.some((c: any) => c.id === CATEGORY_ID_TARGET);
        });

        console.log(`Found ${targetProducts.length} A101 Kaşar Peyniri products.`);

        // 1. Piyasa/Market Ortalaması Hesaplama (Anomali Tespiti için)
        let validUnitPrices: number[] = [];
        for (const p of targetProducts) {
            const name = p.attributes?.name || p.name || '';
            const priceCents = p.price?.discounted || p.price?.normal || 0;
            const price = priceCents / 100;
            const { amount, unit } = parseQuantity(name);
            if (amount && unit === 'kg' && price > 0) {
                validUnitPrices.push(price / amount);
            }
        }

        const marketAvg = validUnitPrices.length > 0
            ? validUnitPrices.reduce((a, b) => a + b, 0) / validUnitPrices.length
            : 350; // Fallback

        const suspiciousThreshold = marketAvg * 0.6; // %40 ve üzeri indirim (Ortalamanın %60'ı)
        console.log(`Market Ortalaması: ${marketAvg.toFixed(2)} TL/kg | Şüpheli Eşiği: ${suspiciousThreshold.toFixed(2)} TL/kg`);

        let upsertedCount = 0;
        let anomalyCount = 0;
        let outOfStockCount = 0;

        for (const product of targetProducts) {
            const name = product.attributes?.name || product.name || '';
            const priceCents = product.price?.discounted || product.price?.normal || 0;
            const price = priceCents / 100;
            const stock = product.stock || 0;

            // 1. Stok Kontrolü
            if (stock <= 0) {
                outOfStockCount++;
                continue;
            }

            // Görsel ve URL Mapping
            let imageUrl = '';
            if (product.images && product.images.length > 0) {
                const realImage = product.images.find((img: any) =>
                    img.url && !img.url.includes('yerliUretim') && !img.url.includes('badge')
                );
                imageUrl = realImage ? realImage.url : product.images[0].url;
            }
            const productUrl = product.social_share_url || `https://www.a101.com.tr${product.seoUrl || ''}`;

            if (!name || price <= 0) continue;

            // 2. Gramaj Ayıklama ve Anomali Tespiti
            const { amount, unit } = parseQuantity(name);
            let isSuspicious = false;

            if (amount && unit === 'kg') {
                const unitPrice = price / amount;

                // %40 SAPMA KURALI: Market ortalamasının %60'ının altındaysa ŞÜPHELİ
                if (unitPrice < suspiciousThreshold) {
                    isSuspicious = true;
                    console.warn(`[ŞÜPHELİ] ${name} - ${unitPrice.toFixed(2)} TL/kg (Ortalamadan %40+ ucuz)`);
                    anomalyCount++;
                }

                // MUTLAK ANOMALİ: Kaşar için 180 TL altı her zaman şüphelidir (güvenlik bariyeri)
                if (unitPrice < 180) {
                    isSuspicious = true;
                }
            }

            // 2c. Category & Tags Mapping
            const mappedCat = getMappedCategory('A101', CATEGORY_ID_TARGET, 'Kaşar Peyniri');
            const finalCategory = mappedCat.master;
            const tagsJson = JSON.stringify(mappedCat.tags);

            // DB Logic
            let dbProduct = await prisma.product.findFirst({
                where: { name: name.trim() }
            });

            if (dbProduct) {
                dbProduct = await prisma.product.update({
                    where: { id: dbProduct.id },
                    data: {
                        imageUrl: imageUrl,
                        category: finalCategory,
                        quantityAmount: amount,
                        quantityUnit: unit,
                        isSuspicious: isSuspicious,
                        tags: tagsJson,
                        updatedAt: new Date()
                    }
                });
            } else {
                dbProduct = await prisma.product.create({
                    data: {
                        name: name.trim(),
                        imageUrl: imageUrl,
                        category: finalCategory,
                        quantityAmount: amount,
                        quantityUnit: unit,
                        isSuspicious: isSuspicious,
                        tags: tagsJson
                    }
                });
            }

            await prisma.price.create({
                data: {
                    amount: price,
                    currency: 'TRY',
                    marketId: market.id,
                    productId: dbProduct.id,
                    productUrl: productUrl
                }
            });

            upsertedCount++;
        }

        console.log(`\nA101 Özet:\n- İşlenen: ${upsertedCount}\n- Stokta Olmayan: ${outOfStockCount}\n- Şüpheli/Anomali: ${anomalyCount}`);

    } catch (e) {
        console.error('Error in A101 fetch:', e);
    } finally {
        await prisma.$disconnect();
    }
}

fetchA101Kasar();
