
import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';
import fs from 'fs';

const storeId = 'VS032';

async function compareProducts() {
    const catId = 'C05'; // Süt & Kahvaltılık
    const url = `https://rio.a101.com.tr/dbmk89vnr/CALL/Store/getProductsByCategory/${storeId}?id=${catId}&channel=SLOT&__culture=tr-TR&__platform=web&data=e30%3D&__isbase64=true`;

    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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

    const good = products.find(p => p.attributes?.name?.includes('Torku') || p.name?.includes('Torku'));
    const bad = products.find(p => p.attributes?.name?.includes('Otat Vadim') || p.name?.includes('Otat Vadim'));

    if (good) fs.writeFileSync('good_product.json', JSON.stringify(good, null, 2));
    if (bad) fs.writeFileSync('bad_product.json', JSON.stringify(bad, null, 2));

    console.log('Files good_product.json and bad_product.json created.');
}

compareProducts();
