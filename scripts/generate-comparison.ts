
import fetch from 'node-fetch';
import fs from 'fs';

const storeId = 'VS032';

async function generateComparison() {
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

    const targets = [
        { key: 'Tarabya', label: 'Alive (A101 Brand)' },
        { key: 'Otat Vadim', label: 'Zombie/Suspect' },
        { key: 'İçim Tost', label: 'Neutral 1' },
        { key: 'Pınar Dilimli', label: 'Neutral 2' }
    ];

    const results: any = {};

    targets.forEach(t => {
        const p = products.find(prod => (prod.attributes?.name || prod.name || '').includes(t.key));
        if (p) {
            results[t.label] = p;
        } else {
            // Find similar if exact not found
            const parts = t.key.split(' ');
            const p2 = products.find(prod => (prod.attributes?.name || prod.name || '').includes(parts[0]));
            results[t.label] = p2 || { error: 'Not Found' };
        }
    });

    fs.writeFileSync('product_comparison_full.json', JSON.stringify(results, null, 2));
    console.log('DONE: product_comparison_full.json created.');
}

generateComparison();
