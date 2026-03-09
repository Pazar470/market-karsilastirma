/**
 * A101 tek yaprak kategori testi: Kaşar Peyniri
 * Kategori yolu (foto): Anasayfa > Kapıda > Süt Ürünleri, Kahvaltılık > Kaşar Peyniri
 * URL: a101.com.tr/kapida/sut-urunleri-kahvaltilik/kasar-peyniri
 *
 * Başarılı tarama mantığı (fetch-a101-kasar.ts): Parent ID (C05) ile API çağrısı yap,
 * yanıttaki ürünlerden categories içinde C0512 (Kaşar Peyniri) olanları filtrele.
 */

import fetch from 'node-fetch';

const STORE_ID = 'VS032';
const PARENT_ID = 'C05';   // Süt & Kahvaltılık
const LEAF_ID = 'C0512';   // Kaşar Peyniri (yaprak)

const url = `https://rio.a101.com.tr/dbmk89vnr/CALL/Store/getProductsByCategory/${STORE_ID}?id=${PARENT_ID}&channel=SLOT&__culture=tr-TR&__platform=web&data=e30%3D&__isbase64=true`;

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://www.a101.com.tr',
    'Referer': 'https://www.a101.com.tr/kapida',
};

async function main() {
    console.log('A101 Tek Yaprak Test: Kaşar Peyniri');
    console.log('URL:', url);
    console.log('');

    const res = await fetch(url, { headers });
    console.log('HTTP', res.status, res.statusText);
    if (!res.ok) {
        const text = await res.text();
        console.log('Body (ilk 500):', text.slice(0, 500));
        return;
    }

    const json: any = await res.json();
    const allProducts: any[] = [];
    if (json.data && Array.isArray(json.data)) allProducts.push(...json.data);
    if (json.children && Array.isArray(json.children)) {
        json.children.forEach((c: any) => {
            if (c.products && Array.isArray(c.products)) allProducts.push(...c.products);
        });
    }

    const leafProducts = allProducts.filter((p: any) => {
        if (!p.categories) return false;
        return p.categories.some((c: any) => c.id === LEAF_ID);
    });

    console.log('Toplam ürün (C05 altında):', allProducts.length);
    console.log('Kaşar Peyniri (C0512) filtresi sonrası:', leafProducts.length);
    console.log('');

    if (leafProducts.length > 0) {
        console.log('İlk 3 ürün:');
        leafProducts.slice(0, 3).forEach((p: any, i: number) => {
            const name = p.attributes?.name || p.name || '';
            const price = (p.price?.discounted || p.price?.normal || 0) / 100;
            console.log(`  ${i + 1}. ${name} — ${price} ₺`);
        });
    } else {
        console.log('Root keys:', Object.keys(json));
        if (allProducts.length > 0) {
            const first = allProducts[0];
            console.log('Örnek ürün categories:', (first as any).categories);
        }
    }
}

main().catch(e => console.error(e));
