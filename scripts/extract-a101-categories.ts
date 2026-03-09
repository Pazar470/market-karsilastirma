
import fetch from 'node-fetch';
import fs from 'fs';

const STORE_ID = 'VS032';
const CATEGORY_IDS = [
    { id: 'C01', name: 'Meyve & Sebze' },
    { id: 'C04', name: 'Et & Tavuk & Şarküteri' },
    { id: 'C05', name: 'Süt & Kahvaltılık' },
    { id: 'C02', name: 'Fırın & Pastane' },
    { id: 'C07', name: 'Temel Gıda' },
    { id: 'C06', name: 'Atıştırmalık' },
    { id: 'C08', name: 'Su & İçecek' },
    { id: 'C10', name: 'Hazır Yemek & Meze' },
    { id: 'C09', name: 'Dondurulmuş Ürünler' },
    { id: 'C11', name: 'Temizlik' },
    { id: 'C12', name: 'Kişisel Bakım' },
    { id: 'C13', name: 'Kağıt Ürünleri' },
    { id: 'C18', name: 'Elektronik' },
    { id: 'C14', name: 'Anne & Bebek' },
    { id: 'C15', name: 'Ev & Yaşam' }
];

async function extractA101Categories() {
    console.log('--- A101 Kategori Keşfi Başlatıldı ---');
    const allLeafCategories: any[] = [];

    for (const root of CATEGORY_IDS) {
        try {
            console.log(`Çekiliyor: ${root.name}...`);
            const url = `https://rio.a101.com.tr/dbmk89vnr/CALL/Store/getProductsByCategory/${STORE_ID}?id=${root.id}&channel=SLOT&__culture=tr-TR&__platform=web&data=e30%3D&__isbase64=true`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Origin': 'https://www.a101.com.tr',
                    'Referer': 'https://www.a101.com.tr/'
                }
            });

            const data: any = await response.json();

            if (data && data.children && Array.isArray(data.children)) {
                for (const child of data.children) {
                    // level 2
                    if (child.children && Array.isArray(child.children)) {
                        for (const subChild of child.children) {
                            // level 3 (Leaf)
                            allLeafCategories.push({
                                id: subChild.id,
                                name: subChild.name,
                                path: `${root.name} > ${child.name} > ${subChild.name}`
                            });
                        }
                    } else {
                        // level 2 is leaf
                        allLeafCategories.push({
                            id: child.id,
                            name: child.name,
                            path: `${root.name} > ${child.name}`
                        });
                    }
                }
            } else {
                // Root is leaf (rare)
                allLeafCategories.push({
                    id: root.id,
                    name: root.name,
                    path: root.name
                });
            }
        } catch (e) {
            console.error(`Hata (${root.name}):`, e);
        }
    }

    const output = {
        market: 'A101',
        totalLeafCategories: allLeafCategories.length,
        categories: allLeafCategories
    };

    fs.writeFileSync('a101_categories.json', JSON.stringify(output, null, 2));
    console.log(`✅ ${allLeafCategories.length} adet "yaprak" kategori bulundu ve a101_categories.json dosyasına kaydedildi.`);
}

extractA101Categories();
