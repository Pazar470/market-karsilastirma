import fetch from 'node-fetch';
import { PrismaClient, Prisma } from '@prisma/client';
import * as cheerio from 'cheerio';
import fs from 'fs';
import { getMappedCategory } from '../lib/category-mapper.ts';

const prisma = new PrismaClient();

const SOK_KASAR_URL = 'https://www.sokmarket.com.tr/kasar-peynir-c-520';

async function fetchSokKasar() {
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

    console.log('Fetching Şok Kaşar Peyniri category...');
    try {
        const res = await fetch(SOK_KASAR_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            }
        });

        if (!res.ok) {
            console.error(`Failed to fetch: ${res.status} ${res.statusText}`);
            return;
        }

        const html = await res.text();
        const $ = cheerio.load(html);
        const products: any[] = [];

        // Select all product cards using partial class match
        const productCards = $('div[class*="CProductCard-module_productCardWrapper"]');

        console.log(`Found ${productCards.length} product cards in HTML.`);

        if (productCards.length === 0) {
            console.error('No product cards found in HTML! Dumping HTML for debugging.');
            fs.writeFileSync('sok-debug-dump.html', html);
            return;
        }

        productCards.each((_, element) => {
            const el = $(element);

            // Name
            const name = el.find('h2[class*="CProductCard-module_title"]').text().trim();

            // Price - Handle potential discounted price structure
            let priceText = el.find('span[class*="CPriceBox-module_price"]').text().trim();
            const discountedPrice = el.find('span[class*="CPriceBox-module_discountedPrice"]').text().trim();
            if (discountedPrice) {
                priceText = discountedPrice;
            }

            // Image
            const imageUrl = el.find('img').attr('src');

            // URL (Partial)
            const relativeUrl = el.find('a').attr('href');
            const productUrl = relativeUrl ? `https://www.sokmarket.com.tr${relativeUrl}` : '';

            if (name && priceText) {
                // Parse price: "289,00₺" -> 289.00
                const price = parseFloat(
                    priceText
                        .replace(/[^\d,]/g, '')
                        .replace(',', '.')
                );

                if (!isNaN(price)) {
                    products.push({
                        name,
                        price,
                        imageUrl: imageUrl || '',
                        productUrl
                    });
                }
            }
        });

        console.log(`Successfully parsed ${products.length} products from HTML.`);

        // 1. Piyasa/Market Ortalaması Hesaplama (Anomali Tespiti için)
        let validUnitPrices: number[] = [];
        for (const p of products) {
            const { amount, unit } = parseQuantity(p.name);
            if (amount && unit === 'kg' && p.price > 0) {
                validUnitPrices.push(p.price / amount);
            }
        }
        const marketAvg = validUnitPrices.length > 0
            ? validUnitPrices.reduce((a, b) => a + b, 0) / validUnitPrices.length
            : 350;
        const suspiciousThreshold = marketAvg * 0.6;
        console.log(`Şok Market Ortalaması: ${marketAvg.toFixed(2)} TL/kg | Şüpheli Eşiği: ${suspiciousThreshold.toFixed(2)} TL/kg`);

        // Ensure Market exists
        let market = await prisma.market.findFirst({ where: { name: 'Şok' } });
        if (!market) {
            market = await prisma.market.create({
                data: { name: 'Şok', website: 'https://www.sokmarket.com.tr' }
            });
            console.log('Created Şok market record.');
        }

        let upsertedCount = 0;
        let anomalyCount = 0;

        for (const product of products) {
            const { name, price, imageUrl, productUrl } = product;
            const { amount, unit } = parseQuantity(name);

            let isSuspicious = false;
            if (amount && unit === 'kg') {
                const unitPrice = price / amount;
                if (unitPrice < suspiciousThreshold) {
                    isSuspicious = true;
                    console.warn(`[ŞÜPHELİ] ${name} - ${unitPrice.toFixed(2)} TL/kg (Sapma: %40+)`);
                    anomalyCount++;
                }
                if (unitPrice < 180) isSuspicious = true;
            }

            // 1. Find or Create Product
            let dbProduct = await prisma.product.findFirst({
                where: { name: name.trim() }
            });

            // 2c. Category & Tags Mapping
            const mappedCat = getMappedCategory('SOK', 'kasar-peynir-c-520', 'Kaşar Peyniri');
            const finalCategory = mappedCat.master;
            const tagsJson = JSON.stringify(mappedCat.tags);

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

            // 2. Add Price Entry
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

        console.log(`\nŞok Özet:\n- İşlenen: ${upsertedCount}\n- Şüpheli/Anomali: ${anomalyCount}`);

    } catch (e) {
        console.error('Error fetching Şok:', e);
    } finally {
        await prisma.$disconnect();
    }
}

fetchSokKasar();
