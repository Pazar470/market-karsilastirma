
import fetch from 'node-fetch';

async function verifyCategoryId() {
    console.log('--- Verifying Migros Category ID Parameter ---');

    // Let's use a specific category ID.
    // We need to find one first. Let's fetch the tree root and pick one.
    const treeRes = await fetch('https://www.migros.com.tr/rest/categories', {
        headers: { 'Content-Type': 'application/json', 'X-Pweb-Device-Type': 'DESKTOP' }
    });
    const treeJson: any = await treeRes.json();
    const firstCat = treeJson.data[0]; // e.g. Meyve Sebze
    const firstSub = firstCat.children[0]; // e.g. Meyve
    // const leaf = firstSub.children[0]; // e.g. Yumuşak Meyve

    // Let's use a hardcoded known ID if possible, or navigate.
    // "Meyve Sebze" usually works.
    const catId = firstCat.data.id;
    const catName = firstCat.data.name;

    console.log = {`Testing Category: ${catName} (ID: ${catId})`);

    // Try fetching with categoryId parameter
    const url = `https://www.migros.com.tr/rest/search/screens/products?category-id=${catId}&page=1`;

    console.log(`Fetching: ${url}`);
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Content-Type': 'application/json',
            'X-Pweb-Device-Type': 'DESKTOP'
        }
    });

    const json: any = await res.json();
    const items = json.data?.searchInfo?.storeProductInfos || [];

    console.log(`Found ${items.length} items using category-id.`);
    items.slice(0, 3).forEach((i: any) => console.log(`- ${i.name}`));
}

verifyCategoryId().catch(console.error);
