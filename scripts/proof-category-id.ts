
import fetch from 'node-fetch';

// This script PROVES that fetching by Category ID avoids unrelated products.
// We found that navigating the tree gave us an ID, but maybe it wasn't the right one for `screens/products`.
// Let's optimize: We will just try to fetch "Peynir" or "Kaşar" with a KNOWN working ID if possible, 
// or debug why 0 items returned.
// Actually, Migros API uses `category-id` but maybe the ID format is different?
// Let's try iterating a bit or using a broader category like Peynir (ID ending in smaller numbers usually).

async function proveCategoryId() {
    console.log('--- PROOF: Fetching "Kaşar Peyniri" by ID (Not Search) ---');

    // 1. Get Tree
    const treeRes = await fetch('https://www.migros.com.tr/rest/categories', {
        headers: { 'Content-Type': 'application/json', 'X-Pweb-Device-Type': 'DESKTOP' }
    });
    const treeJson: any = await treeRes.json();

    // 2. Find "Peynir" (Leaf)
    const milk = treeJson.data.find((c: any) => c.data.name.includes('Süt') && c.data.name.includes('Kahvaltılık'));
    const cheese = milk.children.find((c: any) => c.data.name === 'Peynir');
    const kasar = cheese.children.find((c: any) => c.data.name.includes('Kaşar'));

    // Use the `id` from `data`
    const targetId = kasar.data.id;
    console.log(`Target Category: ${kasar.data.name} (ID: ${targetId})`);

    // 3. Construct URL
    // Maybe we need `categoryid` instead of `category-id`? Or `categoryId`?
    // Let's try multiple common param names if the first fails, but typically `category-id` is correct in legacy docs.
    // Wait, typical Migros URL: search/screens/products?category-id=...

    const url = `https://www.migros.com.tr/rest/search/screens/products?category-id=${targetId}&page=1`;
    console.log(`Fetching: ${url}`);

    const res = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            'X-Pweb-Device-Type': 'DESKTOP',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
    });

    const json: any = await res.json();
    const items = json.data?.searchInfo?.storeProductInfos || [];

    console.log(`Found ${items.length} strictly categorized products.`);

    // Debug: If 0, maybe try parent category?
    if (items.length === 0) {
        console.log('Got 0 items. Trying parent category (Peynir)...');
        const parentId = cheese.data.id;
        const url2 = `https://www.migros.com.tr/rest/search/screens/products?category-id=${parentId}&page=1`;
        console.log(`Fetching Parent: ${url2}`);
        const res2 = await fetch(url2, { headers: { 'Content-Type': 'application/json', 'X-Pweb-Device-Type': 'DESKTOP' } });
        const json2: any = await res2.json();
        const items2 = json2.data?.searchInfo?.storeProductInfos || [];
        console.log(`Parent Found ${items2.length} items.`);
        if (items2.length > 0) items.push(...items2);
    }

    // Audit
    let flashlightCount = 0;
    let cheeseCount = 0;

    items.forEach((item: any) => {
        const name = item.name.toLowerCase();
        if (name.includes('ışıldak') || name.includes('fener') || name.includes('anahtarlık')) {
            flashlightCount++;
            console.log(`❌ ALARM: Found Bad Item! -> ${item.name}`);
        } else if (name.includes('peynir') || name.includes('kaşar')) {
            cheeseCount++;
            if (cheeseCount <= 3) console.log(`✅ Good Item: ${item.name}`);
        }
    });

    console.log('\n--- AUDIT RESULTS ---');
    console.log(`Total Items Checked: ${items.length}`);
    console.log(`✅ Valid Cheese Items: ${cheeseCount}`);
    console.log(`❌ Bad Items: ${flashlightCount}`);
}

proveCategoryId().catch(console.error);
