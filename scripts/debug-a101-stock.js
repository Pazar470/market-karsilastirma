
// Node 18+ has global fetch
const fs = require('fs');
const path = require('path');

async function debug() {
    console.log('--- Debugging A101 Stock ---');
    const cats = ['C05', 'C08']; // Cheese and Drinks
    const storeId = 'VS032';

    let allProducts = [];

    for (const catId of cats) {
        console.log(`Fetching ${catId}...`);
        const url = `https://rio.a101.com.tr/dbmk89vnr/CALL/Store/getProductsByCategory/${storeId}?id=${catId}&channel=SLOT&__culture=tr-TR&__platform=web&data=e30%3D&__isbase64=true`;

        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Origin': 'https://www.a101.com.tr',
                    'Referer': 'https://www.a101.com.tr/'
                }
            });
            const data = await response.json();

            if (data.data) allProducts.push(...data.data);
            if (data.children) {
                data.children.forEach(c => {
                    if (c.products) allProducts.push(...c.products);
                });
            }
        } catch (e) {
            console.error(`Error ${catId}:`, e.message);
        }
    }

    // Check Regüler brands
    const regulerItems = allProducts.filter(p => p.attributes && p.attributes.nitelikAdi === 'Regüler');
    console.log(`Found ${regulerItems.length} Regüler items.`);

    if (regulerItems.length > 0) {
        const samples = regulerItems.sort(() => 0.5 - Math.random()).slice(0, 15);
        samples.forEach(t => {
            const name = t.name || (t.attributes ? t.attributes.name : '') || 'Unknown';
            const brand = t.attributes ? t.attributes.brand : 'Unknown';
            console.log(`--- Regüler Sample: ${name} (${brand}) ---`);
        });
    }
}

debug();
