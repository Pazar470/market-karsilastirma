
import fetch from 'node-fetch';

async function proveCategoryId() {
    console.log('--- FINAL PROOF: Category ID Fetching ---');

    // We will try a known working category ID for "Kaşar Peyniri"
    // I will try a few variations of the ID or endpoint parameters to get a hit.

    // 1. Get the Tree first to be 100% sure of the ID
    const treeRes = await fetch('https://www.migros.com.tr/rest/categories', {
        headers: { 'Content-Type': 'application/json', 'X-Pweb-Device-Type': 'DESKTOP' }
    });
    const tree = await treeRes.json();

    // Drill down: Süt Kahvaltılık (id: ?)
    const root = tree.data.find((c: any) => c.data.name.includes('Süt'));
    if (!root) throw new Error('Root not found');

    // Child: Peynir
    const sub = root.children.find((c: any) => c.data.name === 'Peynir');

    // Leaf: Kaşar Peyniri
    const leaf = sub.children.find((c: any) => c.data.name.includes('Kaşar'));

    console.log(`Using Leaf: ${leaf.data.name} (ID: ${leaf.data.id})`);

    // URL Strategy:
    // Migros often uses POST for category listings in some versions, or specific params.
    // Let's try the standard search endpoint with category-id filter which is what the web app does.

    const url = `https://www.migros.com.tr/rest/search/screens/products?category-id=${leaf.data.id}&page=1&sort=RELEVANCE`;

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

    console.log(`Found ${items.length} items.`);

    if (items.length > 0) {
        const bad = items.filter((i: any) => i.name.toLowerCase().includes('ışıldak'));
        console.log(`Flashlights found: ${bad.length}`);
        if (bad.length === 0) console.log('✅ SUCCESS: Clean results!');
    } else {
        console.log('⚠️ Still 0 items. This suggests we might need a REFERER or specific header, or the ID is for a landing page compatibility.');
    }
}

proveCategoryId().catch(console.error);
