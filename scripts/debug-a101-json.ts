
import fetch from 'node-fetch';

async function debugA101() {
    console.log('Fetching A101 Süt & Kahvaltılık (C05)...');
    // EXACT URL from working scraper (scraper/a101.ts)
    const storeId = 'VS032';


    const catId = 'C05';
    const url = `https://rio.a101.com.tr/dbmk89vnr/CALL/Store/getProductsByCategory/${storeId}?id=${catId}&channel=SLOT&__culture=tr-TR&__platform=web&data=e30%3D&__isbase64=true`;

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://www.a101.com.tr',
                'Referer': 'https://www.a101.com.tr/'
            }
        });
        const json: any = await res.json();

        let products: any[] = [];
        if (json.data && Array.isArray(json.data)) products.push(...json.data);
        if (json.children && Array.isArray(json.children)) {
            json.children.forEach((c: any) => {
                if (c.products) products.push(...c.products);
            });
        }

        console.log('--- ÜRÜN STOK VE RS ANALİZİ ---');
        const aliveProduct = products.find(p => p.attributes?.name?.includes('Tarabya') || p.name?.includes('Tarabya'));
        const zombieProduct = products.find(p => p.attributes?.name?.includes('Otat Vadim') || p.name?.includes('Otat Vadim'));

        if (aliveProduct) {
            console.log('=== CANLI ÜRÜN (Tarabya) ===');
            console.log(JSON.stringify(aliveProduct, null, 2));
            console.log('============================');
        }

        if (zombieProduct) {
            console.log('=== ZOMBİ ÜRÜN (Otat Vadim) ===');
            console.log(JSON.stringify(zombieProduct, null, 2));
            console.log('===============================');
        }

    } catch (e) {
        console.error('Bağlantı Hatası:', e);
    }
}

debugA101();
