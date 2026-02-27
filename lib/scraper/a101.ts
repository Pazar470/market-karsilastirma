
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';

export interface ScrapedProduct {
    name: string;
    price: number;
    imageUrl: string;
    link: string;
    store: 'A101';
    category?: string;
    quantityAmount?: number;
    quantityUnit?: string;
}

import { parseUnit } from '../unit-parser';
import { isProductValid } from '../product-sanity-check';

// Category IDs mapping
// Updated based on actual A101 URLs (2024-02-09)
const CATEGORY_IDS = [
    { id: 'C01', name: 'Meyve & Sebze' },
    { id: 'C04', name: 'Et & Tavuk & Şarküteri' },
    { id: 'C05', name: 'Süt & Kahvaltılık' },
    { id: 'C02', name: 'Fırın & Pastane' }, // Was 'Fırından'
    { id: 'C07', name: 'Temel Gıda' },
    { id: 'C06', name: 'Atıştırmalık' },
    { id: 'C08', name: 'Su & İçecek' },
    { id: 'C10', name: 'Hazır Yemek & Meze' }, // Was 'Donuk Hazır Yemek'
    { id: 'C09', name: 'Dondurulmuş Ürünler' },
    { id: 'C11', name: 'Temizlik' }, // Was 'Temizlik Ürünleri'
    { id: 'C12', name: 'Kişisel Bakım' },
    { id: 'C13', name: 'Kağıt Ürünleri' },
    { id: 'C18', name: 'Elektronik' },
    { id: 'C14', name: 'Anne & Bebek' },
    { id: 'C15', name: 'Ev & Yaşam' }
];

export async function scrapeA101(): Promise<ScrapedProduct[]> {
    console.log('Starting A101 API Scraper...');
    const allProducts: ScrapedProduct[] = [];
    const storeId = 'VS032'; // Default store

    for (const cat of CATEGORY_IDS) {
        try {
            const url = `https://rio.a101.com.tr/dbmk89vnr/CALL/Store/getProductsByCategory/${storeId}?id=${cat.id}&channel=SLOT&__culture=tr-TR&__platform=web&data=e30%3D&__isbase64=true`;
            console.log(`Fetching category: ${cat.name} (${cat.id})...`);
            // console.log('URL:', url);

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Origin': 'https://www.a101.com.tr',
                    'Referer': 'https://www.a101.com.tr/'
                }
            });

            if (!response.ok) {
                console.error(`Failed to fetch ${cat.name}: ${response.status} ${response.statusText}`);
                continue;
            }

            const data: any = await response.json();
            let productsToProcess: any[] = [];

            // Case 1: Direct products in data.data (seen in test script)
            if (data && data.data && Array.isArray(data.data)) {
                productsToProcess.push(...data.data);
            }
            // Case 2: Products nested in children (seen in debug)
            if (data && data.children && Array.isArray(data.children)) {
                for (const child of data.children) {
                    if (child.products && Array.isArray(child.products)) {
                        productsToProcess.push(...child.products);
                    }
                }
            }

            if (productsToProcess.length > 0) {
                console.log(`Found ${productsToProcess.length} items in ${cat.name}`);

                for (const item of productsToProcess) {
                    try {
                        // MAP FIELDS
                        const name = item.name || (item.attributes ? item.attributes.name : '') || '';

                        // Filter out unstable stock (KasaAktivitesi, etc.)
                        // 'Regüler': Standard stock.
                        // 'GrupSpot': Weekly specials (Aldın Aldın), usually buyable.
                        // We exclude 'KasaAktivitesi' which is conditional.
                        const validNitelik = ['Regüler', 'GrupSpot'];
                        if (!validNitelik.includes(item.attributes?.nitelikAdi)) {
                            continue;
                        }

                        // PRICE PARSING
                        let price = 0;
                        // Inspect result showed: item.price = { normal: 4950, normalStr: '₺49,50' ... }
                        // So we need to check if it's an object and has 'image' property is not price.

                        if (item.price && typeof item.price === 'object') {
                            if (item.price.discounted) price = item.price.discounted;
                            else if (item.price.normal) price = item.price.normal;
                        }
                        else if (typeof item.price === 'number') {
                            price = item.price;
                        }

                        if (price === 0 && item.salePrice) {
                            if (typeof item.salePrice === 'object') {
                                if (item.salePrice.discounted) price = item.salePrice.discounted;
                                else if (item.salePrice.normal) price = item.salePrice.normal;
                            } else if (typeof item.salePrice === 'number') {
                                price = item.salePrice;
                            }
                        }

                        // A101 usually sends prices as integers (4950 = 49.50 TL)
                        // If price is > 1000 and looks like it needs division
                        // Inspect result: 4950 -> 49.50. So we divide by 100.
                        // But let's be careful. if it is 500, is it 5.00 or 500?
                        // "normalStr": "₺49,50" confirms 4950 is 49.50.
                        if (price > 0) {
                            price = price / 100;
                        }

                        // CATEGORY PARSING - DEEP DIVE (Refactored for Full Path)
                        let category = cat.name; // Fallback to root (e.g. "Süt & Kahvaltılık")

                        // Check if item has 'categories' array which contains the path
                        // Format: [{id: 'C05', name: 'Süt...'}, {id: 'C0501', name: 'Peynir'}]
                        if (Array.isArray(item.categories) && item.categories.length > 0) {
                            // Sort by ID length ascending (C05 -> C0501 -> C050101) to get proper hierarchy
                            const sortedCats = item.categories.sort((a: any, b: any) => (a.id?.length || 0) - (b.id?.length || 0));

                            // Construct Path string: "Süt & Kahvaltılık > Peynir > Kaşar Peyniri"
                            const pathNames = sortedCats.map((c: any) => c.name).filter(Boolean);
                            if (pathNames.length > 0) {
                                category = pathNames.join(' > ');
                            }
                        }
                        // Sometimes it's in attributes.category (usually just leaf or path string)
                        else if (item.attributes?.category) {
                            category = item.attributes.category;
                        }

                        // UNIT PARSING
                        const unitInfo = parseUnit(name);

                        // IMAGE PARSING
                        let imageUrl = '';
                        if (item.images && item.images.length > 0) {
                            // Filter out unwanted images
                            const unwantedKeywords = ['yerli', 'dondurulmus', 'glutensiz', 'vegan', 'helal', 'donukurun', 'yerliuretim'];
                            const validImg = item.images.find((img: any) => {
                                if (!img.url) return false;
                                const lowerUrl = img.url.toLowerCase();
                                return !unwantedKeywords.some(kw => lowerUrl.includes(kw));
                            });

                            if (validImg) imageUrl = validImg.url;
                            else imageUrl = item.images[0].url; // Fallback
                        }

                        // Fix relative URLs
                        if (imageUrl && !imageUrl.startsWith('http')) {
                            if (imageUrl.startsWith('/')) {
                                imageUrl = `https://cdn2.a101.com.tr${imageUrl}`;
                            }
                        }

                        // Link
                        let link = `https://www.a101.com.tr/kapida/u/${item.url || item.slug || item.id}`;

                        // FIX: Verify Category Accuracy using Sanity Check
                        // A101 sometimes returns mixed products (e.g. Milk in Fruit category)
                        // and products often lack intrinsic category path, relying on 'cat.name'.
                        // This firewall prevents miscategorized items.
                        if (!isProductValid(name, category, price)) {
                            // console.warn(`Skipping invalid product: ${name} in ${category}`);
                            continue;
                        }

                        if (name && (price > 0 || true)) {
                            allProducts.push({
                                name,
                                price: Number(price),
                                imageUrl,
                                link,
                                store: 'A101',
                                category: category, // Use validated deep category
                                quantityAmount: unitInfo ? unitInfo.amount : undefined,
                                quantityUnit: unitInfo ? unitInfo.unit : undefined
                            });
                        }

                    } catch (parseErr) {
                        console.error('Error parsing item:', parseErr);
                    }
                }
            } else {
                console.log(`No products found for ${cat.name}`);
            }

        } catch (error) {
            console.error(`Error scraping category ${cat.name}:`, error);
        }

        // Politeness delay
        await new Promise(r => setTimeout(r, 1000));
    }

    return allProducts;
}
