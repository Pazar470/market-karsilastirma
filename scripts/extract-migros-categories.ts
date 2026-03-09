
import fetch from 'node-fetch';
import fs from 'fs';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'X-Pweb-Device-Type': 'DESKTOP'
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

function flattenCategories(categories: MigrosCategoryRaw[], parentName = ''): any[] {
    let list: any[] = [];
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
                productCount: cat.data.productCount
            });
        }
    }
    return list;
}

async function extractMigrosCategories() {
    console.log('--- Migros Kategori Keşfi Başlatıldı ---');
    const url = 'https://www.migros.com.tr/rest/categories';

    try {
        const res = await fetch(url, { headers: HEADERS });
        const json: any = await res.json();
        const rawList: MigrosCategoryRaw[] = json.data || [];

        const leafCategories = flattenCategories(rawList);

        const output = {
            market: 'Migros',
            totalLeafCategories: leafCategories.length,
            categories: leafCategories
        };

        fs.writeFileSync('migros_categories.json', JSON.stringify(output, null, 2));
        console.log(`✅ ${leafCategories.length} adet "yaprak" kategori bulundu ve migros_categories.json dosyasına kaydedildi.`);

        // Örnek birkaç kategori yazdıralım
        console.log('\nÖrnek Kategoriler:');
        leafCategories.slice(0, 5).forEach(c => console.log(`- ${c.path} (ID: ${c.id})`));

    } catch (e) {
        console.error('Kategoriler çekilemedi:', e);
    }
}

extractMigrosCategories();
