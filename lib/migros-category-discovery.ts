/**
 * Migros kategori keşfi: rest/categories ile tüm ağacı çekip sadece yaprak kategorileri
 * migros_categories.json olarak yazar. Taramadan önce çağrılır; böylece liste her turda güncel kalır.
 */
import fs from 'fs';
import path from 'path';

const MIGROS_CATEGORIES_URL = 'https://www.migros.com.tr/rest/categories';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'X-Pweb-Device-Type': 'DESKTOP',
};

interface MigrosCategoryRaw {
    data: {
        id: number;
        name: string;
        prettyName: string;
        productCount?: number;
    };
    children?: MigrosCategoryRaw[];
}

function flattenCategories(categories: MigrosCategoryRaw[], parentName = ''): { id: number; name: string; prettyName: string; path: string; productCount?: number }[] {
    let list: { id: number; name: string; prettyName: string; path: string; productCount?: number }[] = [];
    for (const cat of categories) {
        const currentPath = parentName ? `${parentName} > ${cat.data.name}` : cat.data.name;
        if (cat.children && cat.children.length > 0) {
            list = list.concat(flattenCategories(cat.children, currentPath));
        } else {
            list.push({
                id: cat.data.id,
                name: cat.data.name,
                prettyName: cat.data.prettyName,
                path: currentPath,
                productCount: cat.data.productCount,
            });
        }
    }
    return list;
}

export async function runMigrosCategoryDiscovery(opts?: { silent?: boolean }): Promise<{ leafCount: number; path: string }> {
    const outPath = path.join(process.cwd(), 'migros_categories.json');
    if (!opts?.silent) console.log('📂 Migros: Kategori keşfi (rest/categories → yaprak liste)...');
    const res = await fetch(MIGROS_CATEGORIES_URL, { headers: HEADERS });
    if (!res.ok) throw new Error(`Migros categories ${res.status}: ${res.statusText}`);
    const json: { data?: MigrosCategoryRaw[] } = await res.json();
    const rawList: MigrosCategoryRaw[] = json.data || [];
    const leafCategories = flattenCategories(rawList);
    const output = {
        market: 'Migros',
        totalLeafCategories: leafCategories.length,
        categories: leafCategories,
    };
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
    if (!opts?.silent) console.log(`   migros_categories.json güncellendi (${leafCategories.length} yaprak).`);
    return { leafCount: leafCategories.length, path: outPath };
}
