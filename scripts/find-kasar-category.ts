
import * as fs from 'fs';
import * as path from 'path';

const catsPath = path.join(process.cwd(), 'migros_categories.json');
const rawData = fs.readFileSync(catsPath, 'utf-8');
const json = JSON.parse(rawData);

function findCategory(cats: any[], target: string, pathNames: string[] = []) {
    for (const cat of cats) {
        const currentPath = [...pathNames, cat.data.name];
        if (cat.data.name.toLowerCase().includes(target.toLowerCase())) {
            console.log(`Match: ${currentPath.join(' > ')}`);
            console.log(`  ID: ${cat.data.id}`);
            console.log(`  PrettyName: ${cat.data.prettyName}`);
        }
        if (cat.children && cat.children.length > 0) {
            findCategory(cat.children, target, currentPath);
        }
    }
}

console.log('--- Searching for "Kaşar" ---');
findCategory(json.data, 'Kaşar');


const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'X-Pweb-Device-Type': 'DESKTOP'
};

async function fetchProducts(slug: string) {
    console.log(`\nFetching products for slug: ${slug}...`);
    const url = `https://www.migros.com.tr/rest/search/screens/${slug}?page=1&reid=123456789`;
    try {
        const res = await fetch(url, { headers: HEADERS });
        if (!res.ok) {
            console.error(`Failed to fetch: ${res.status}`);
            return;
        }
        const json: any = await res.json();
        const items = json.data?.searchInfo?.storeProductInfos || [];
        console.log(`Found ${items.length} items.`);
        items.slice(0, 10).forEach((p: any) => console.log(`- ${p.name}`));
    } catch (e) {
        console.error('Error fetching products:', e);
    }
}

// ... existing code ...

// After finding, fetch for 'kasar-peyniri-c-40d'
fetchProducts('kasar-peyniri-c-40d');

