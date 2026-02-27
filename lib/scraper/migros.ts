
import fetch from 'node-fetch';
import { parseUnit } from '../unit-parser';

interface ScrapedProduct {
    name: string;
    price: number;
    imageUrl: string;
    link: string;
    store: 'Migros';
    category: string;
    quantityAmount?: number;
    quantityUnit?: string;
}

// Queries to cover main categories
// We use broad search terms to discover products.
// Since we map the *actual* category from the product response, the query name itself is less critical for data integrity,
// but important for coverage.
export const CATEGORIES = [
    // Temel Gıda
    { name: 'Süt', query: 'süt' },
    { name: 'Yoğurt', query: 'yoğurt' },
    { name: 'Peynir', query: 'peynir' },
    { name: 'Yumurta', query: 'yumurta' },
    { name: 'Yağ', query: 'ayçiçek yağı' }, // specific to avoid motor oil etc (though unlikely in migros)
    { name: 'Tereyağı', query: 'tereyağı' },
    { name: 'Un', query: 'un' },
    { name: 'Şeker', query: 'toz şeker' },
    { name: 'Bakliyat', query: 'bakliyat' }, // might need generic
    { name: 'Pirinç', query: 'pirinç' },
    { name: 'Makarna', query: 'makarna' },
    { name: 'Salça', query: 'salça' },

    // Et & Tavuk
    { name: 'Kıyma', query: 'kıyma' },
    { name: 'Tavuk', query: 'tavuk' },
    { name: 'Sucuk', query: 'sucuk' },

    // Kahvaltılık
    { name: 'Zeytin', query: 'zeytin' },
    { name: 'Bal', query: 'bal' },
    { name: 'Çay', query: 'çay' },
    { name: 'Kahve', query: 'kahve' },

    // Temizlik & Kağıt
    { name: 'Deterjan', query: 'deterjan' },
    { name: 'Tuvalet Kağıdı', query: 'tuvalet kağıdı' },
    { name: 'Kağıt Havlu', query: 'kağıt havlu' },

    // Sebze Meyve (Generic searches often work well in Migros)
    { name: 'Sebze', query: 'sebze' },
    { name: 'Meyve', query: 'meyve' },

    // Missing Categories (Added for parity)
    { name: 'Atıştırmalık', query: 'cips' },
    { name: 'Atıştırmalık', query: 'çikolata' },
    { name: 'Atıştırmalık', query: 'bisküvi' },
    { name: 'İçecek', query: 'su' },
    { name: 'İçecek', query: 'kola' },
    { name: 'İçecek', query: 'meyve suyu' },
    { name: 'Kişisel Bakım', query: 'şampuan' },
    { name: 'Kişisel Bakım', query: 'diş macunu' },
    { name: 'Bebek', query: 'bebek bezi' }
];

const BASE_URL = 'https://www.migros.com.tr/rest/search/screens/products';
// Random UUID works as per investigation
const REID = '1234567890123456789';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'X-Pweb-Device-Type': 'DESKTOP'
};

export async function scrapeMigros(): Promise<ScrapedProduct[]> {
    console.log('Starting Migros scraper...');
    let allProducts: ScrapedProduct[] = [];

    // Prioritize queries? Or just run all.
    // For large scale, we might want to chunk this.

    for (const cat of CATEGORIES) {
        console.log(`Scraping query: ${cat.query}...`);

        // LIMIT strategy: For now scrape 1-2 pages per query to get a good sample.
        // In production we would scrape all pages.
        // Increased limit for production
        const MAX_PAGES = 50;
        let page = 1;
        let hasMore = true;

        while (hasMore && page <= MAX_PAGES) {
            const url = `${BASE_URL}?q=${encodeURIComponent(cat.query)}&reid=${REID}&page=${page}`;

            try {
                // polite delay
                await new Promise(r => setTimeout(r, 500));

                const res = await fetch(url, { headers: HEADERS });
                if (!res.ok) {
                    console.error(`Failed to fetch ${url}: ${res.status}`);
                    break;
                }
                const data: any = await res.json();

                if (!data.data?.searchInfo?.storeProductInfos) {
                    hasMore = false;
                    break;
                }

                const products = data.data.searchInfo.storeProductInfos;
                if (products.length === 0) {
                    hasMore = false;
                    break;
                }

                console.log(`  Page ${page}: Found ${products.length} items`);

                for (const p of products) {
                    // Extract Price (cents to TL)
                    const priceVal = p.shownPrice || p.regularPrice;
                    const price = priceVal / 100;

                    // Extract Image
                    // p.images[0].urls.PRODUCT_DETAIL
                    let imageUrl = '';
                    if (p.images && p.images.length > 0 && p.images[0].urls) {
                        imageUrl = p.images[0].urls.PRODUCT_DETAIL || p.images[0].urls.PRODUCT_LIST || '';
                    }

                    // Extract Category
                    // Use the specific category from Migros if available, else fallback to our Query Name
                    const category = p.category?.name || cat.name;

                    const unitInfo = parseUnit(p.name);

                    allProducts.push({
                        name: p.name,
                        price: price,
                        imageUrl: imageUrl,
                        link: `https://www.migros.com.tr/${p.prettyName}`,
                        store: 'Migros',
                        category: category,
                        quantityAmount: unitInfo?.amount,
                        quantityUnit: unitInfo?.unit
                    });
                }

                page++;

            } catch (e) {
                console.error(`Error scraping ${cat.query} page ${page}:`, e);
                hasMore = false;
            }
        }
    }

    console.log(`Total items scraped from Migros: ${allProducts.length}`);
    return allProducts;
}
