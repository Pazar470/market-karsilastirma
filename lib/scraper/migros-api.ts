
import fetch from 'node-fetch';
import { parseUnit } from '../unit-parser';

interface MigrosCategoryRaw {
    data: {
        id: number;
        name: string;
        prettyName: string;
        productCount?: number;
        level?: number;
    };
    children?: MigrosCategoryRaw[];
}

interface MigrosCategory {
    id: number;
    name: string;
    prettyName: string;
    children: MigrosCategory[]; // Always an array, empty if no children
}

interface ScrapedProduct {
    name: string;
    price: number;
    imageUrl: string;
    link: string;
    store: 'Migros';
    category: string;
    subCategory?: string;
    leafCategory?: string;
    quantityAmount?: number;
    quantityUnit?: string;
}

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'X-Pweb-Device-Type': 'DESKTOP'
};

function normalizeCategory(raw: MigrosCategoryRaw): MigrosCategory {
    return {
        id: raw.data.id,
        name: raw.data.name,
        prettyName: raw.data.prettyName,
        children: (raw.children || []).map(normalizeCategory)
    };
}

// 1. Fetch Full Category Tree
async function getCategoryTree(): Promise<MigrosCategory[]> {
    const url = 'https://www.migros.com.tr/rest/categories';
    try {
        const res = await fetch(url, { headers: HEADERS });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json: any = await res.json();
        // API returns { data: [ { data: {...}, children: [] } ] }
        const rawList: MigrosCategoryRaw[] = json.data || [];
        return rawList.map(normalizeCategory);
    } catch (e) {
        console.error('Failed to fetch Migros categories:', e);
        return [];
    }
}

// 2. Recursive Flattening of Leaf Categories
function extractLeafCategories(categories: MigrosCategory[], parentName = ''): { id: number, path: string, prettyName: string }[] {
    let leaves: { id: number, path: string, prettyName: string }[] = [];

    for (const cat of categories) {
        // Construct breadcrumb like "Meyve Sebze > Sebze > Domates"
        const currentPath = parentName ? `${parentName} > ${cat.name}` : cat.name;

        if (cat.children && cat.children.length > 0) {
            leaves = leaves.concat(extractLeafCategories(cat.children, currentPath));
        } else {
            // It's a leaf!
            // It's a leaf!
            leaves.push({ id: cat.id, path: currentPath, prettyName: cat.prettyName });
        }
    }
    return leaves;
}

// 3. Fetch Products for a Category (Pagination)
export async function getProductsByCategory(leaf: { id: number, path: string, prettyName: string }): Promise<ScrapedProduct[]> {
    const products: ScrapedProduct[] = [];

    // Extract the actual leaf name for the API query
    const parts = leaf.path.split(' > ');
    const queryName = parts[parts.length - 1];

    // Use PrettyName (Slug) for reliable fetching
    // Endpoint: https://www.migros.com.tr/rest/search/screens/{slug}?page=1
    const url = (page: number) => `https://www.migros.com.tr/rest/search/screens/${leaf.prettyName}?page=${page}&reid=123456789`;

    let page = 1;
    let hasMore = true;
    const MAX_PAGES = 50;

    while (hasMore && page <= MAX_PAGES) {
        try {
            const res = await fetch(url(page), { headers: HEADERS });
            if (!res.ok) {
                console.error(`Failed leaf ${queryName} page ${page}: ${res.status} ${res.statusText}`);
                const text = await res.text();
                // console.error('Response:', text.substring(0, 100)); // Log head of error
                break;
            }

            const text = await res.text();
            let json: any;
            try {
                json = JSON.parse(text);
            } catch (e) {
                console.error(`Invalid JSON for ${queryName} page ${page}:`, text.substring(0, 100));
                break;
            }
            // Handle different API response structures (Search vs Category List)
            const items = json.data?.storeProductInfos || json.data?.searchInfo?.storeProductInfos || [];

            if (items.length === 0) {
                hasMore = false;
                break;
            }

            for (const item of items) {
                const priceVal = item.shownPrice || item.regularPrice || 0;
                const price = priceVal / 100;
                const img = item.images?.[0]?.urls?.PRODUCT_DETAIL || item.images?.[0]?.urls?.PRODUCT_LIST || '';
                const unitInfo = parseUnit(item.name);

                // CRITICAL: Use the FULL PATH from our breadcrumb logic
                // The API's 'item.category.name' is usually just the leaf (e.g. "Domates").
                // We want "Meyve Sebze > Sebze > Domates".
                const finalCategory = leaf.path;

                if (item.name && price > 0) {
                    products.push({
                        name: item.name,
                        price,
                        imageUrl: img,
                        link: `https://www.migros.com.tr/${item.prettyName}`,
                        store: 'Migros',
                        category: finalCategory,
                        quantityAmount: unitInfo?.amount,
                        quantityUnit: unitInfo?.unit
                    });
                }
            }
            page++;
            await new Promise(r => setTimeout(r, 200));

        } catch (e) {
            console.error(`Error fetching products for leaf ${queryName}:`, e);
            hasMore = false;
        }
    }

    console.log(`  Fetched ${products.length} for "${leaf.path}"`);
    return products;
}

// MAIN EXPORT
export async function scrapeMigrosAPI(onBatch?: (products: ScrapedProduct[]) => Promise<void>): Promise<ScrapedProduct[]> {
    console.log('🚀 Starting Migros API Scraper...');

    // 1. Get Tree
    const tree = await getCategoryTree();
    console.log(`Found ${tree.length} root categories.`);

    // 2. Flatten to Leaves
    const relevantRoots = tree.filter(c => c.name && !c.name.includes('İndirim') && !c.name.includes('Fırsat'));
    const leaves = extractLeafCategories(relevantRoots);
    console.log(`Found ${leaves.length} leaf categories to scrape.`);

    // 3. Scrape in Parallel (Chuncked)
    let allProducts: ScrapedProduct[] = [];
    const CHUNK_SIZE = 5;

    for (let i = 0; i < leaves.length; i += CHUNK_SIZE) {
        const chunk = leaves.slice(i, i + CHUNK_SIZE);
        console.log(`Processing chunk ${Math.ceil(i / CHUNK_SIZE) + 1}/${Math.ceil(leaves.length / CHUNK_SIZE)}...`);

        const promises = chunk.map(leaf => {
            // We pass the FULL PATH as the leafName argument now, 
            // but we need to extract the query part for the API.
            // Actually, let's keep it simple: Pass the full path object to getProductsByCategory
            return getProductsByCategory(leaf);
        });

        const results = await Promise.all(promises);
        const chunkProducts = results.flat();

        console.log(`  Chunk ${Math.ceil(i / CHUNK_SIZE) + 1} produced ${chunkProducts.length} products.`);

        if (onBatch && chunkProducts.length > 0) {
            console.log(`  Calling onBatch with ${chunkProducts.length} items...`);
            await onBatch(chunkProducts);
        }

        allProducts.push(...chunkProducts);
    }

    console.log(`✅ Total Migros Products: ${allProducts.length}`);
    return allProducts;
}
