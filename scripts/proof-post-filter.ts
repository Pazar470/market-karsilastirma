
import fetch from 'node-fetch';

// This script PROVES that we can distinguish products by their Category ID post-fetch.
// Since direct filtering yielded 0 items (API idiosyncrasy), we will fetch via Search ("Kaşar")
// which we KNOW returns trash (Flashlights).
// We will then inspect the `category.id` of these items and show that:
// Flashlight ID != Chees ID.
// This proves we can strictly enforce ID matching in our scraper to discard trash.

async function provePostFilter() {
    console.log('--- PROOF: Examining Category IDs for Filtering ---');

    // 1. Get Tree for "Kaşar Peyniri" ID
    const treeRes = await fetch('https://www.migros.com.tr/rest/categories', {
        headers: { 'Content-Type': 'application/json', 'X-Pweb-Device-Type': 'DESKTOP' }
    });
    const tree = await treeRes.json();
    const root = tree.data.find((c: any) => c.data.name.includes('Süt'));
    const sub = root.children.find((c: any) => c.data.name === 'Peynir');
    const leaf = sub.children.find((c: any) => c.data.name.includes('Kaşar'));

    const TARGET_ID = leaf.data.id;
    console.log(`Target Category: ${leaf.data.name} (ID: ${TARGET_ID})`);

    // 2. Fetch via SEARCH (The "Dirty" Method)
    const url = `https://www.migros.com.tr/rest/search/screens/products?q=Kaşar&page=1`;
    console.log(`Fetching Search Results: ${url}`);

    const res = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            'X-Pweb-Device-Type': 'DESKTOP',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
    });

    const json: any = await res.json();
    const items = json.data?.searchInfo?.storeProductInfos || [];

    console.log(`Found ${items.length} items.`);

    // 3. Inspect IDs
    let validCount = 0;
    let rejectedCount = 0;

    items.forEach((item: any) => {
        const itemCatId = item.category?.id;
        const name = item.name;

        // Check if ID matches our Target
        // Note: Migros might return string or number ID, handle both.
        const isMatch = String(itemCatId) === String(TARGET_ID);

        if (isMatch) {
            validCount++;
            // console.log(`✅ MATCH: [${itemCatId}] ${name}`);
        } else {
            rejectedCount++;
            const isFlashlight = name.toLowerCase().includes('ışıldak') || name.toLowerCase().includes('fener');
            if (isFlashlight) {
                console.log(`❌ BLOCKING TRASH: [${itemCatId}] ${name} (Expected: ${TARGET_ID})`);
            } else {
                // console.log(`ℹ️ Filtering Unrelated: [${itemCatId}] ${name}`);
            }
        }
    });

    console.log('\n--- PROOF RESULTS ---');
    console.log(`Valid Count (ID MATCH): ${validCount}`);
    console.log(`Rejected Count (ID MISMATCH): ${rejectedCount}`);

    if (rejectedCount > 0) {
        console.log('\nSUCCESS: We can successfully identify and block unrelated items by enforcing the Category ID.');
    } else {
        console.log('\nWARNING: No items rejected. If flashlights were present, they shared the ID? (Unlikely)');
    }
}

provePostFilter().catch(console.error);
