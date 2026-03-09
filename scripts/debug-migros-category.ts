
import fetch from 'node-fetch';

async function testCategoryFetch() {
    console.log('--- Step 1: Finding "Domates" Category & PrettyName ---');
    const treeUrl = 'https://www.migros.com.tr/rest/categories';
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',
        'X-Pweb-Device-Type': 'DESKTOP'
    };

    let targetId = 0;
    let targetName = '';
    let targetPrettyName = '';

    // Recursive Finder
    function findCategoryByName(cat: any, name: string): any {
        if (cat.data.name.includes(name) || (cat.data.prettyName && cat.data.prettyName.includes(name.toLowerCase()))) return cat;

        if (cat.children) {
            for (const c of cat.children) {
                const found = findCategoryByName(c, name);
                if (found) return found;
            }
        }
        return null;
    }

    try {
        const res = await fetch(treeUrl, { headers });
        const json: any = await res.json();

        let leaf = null;
        for (const root of json.data) {
            leaf = findCategoryByName(root, 'Domates'); // Try "Domates" first
            if (leaf) break;
        }

        if (!leaf) {
            console.log('Domates not found, trying Süt...');
            for (const root of json.data) {
                leaf = findCategoryByName(root, 'Süt');
                if (leaf) break;
            }
        }

        if (leaf) {
            targetId = leaf.data.id;
            targetName = leaf.data.name;
            targetPrettyName = leaf.data.prettyName;
            console.log(`Found Category: ${targetName} (ID: ${targetId})`);
            console.log(`PrettyName: ${targetPrettyName}`);
        } else {
            console.error('Could not find any category.');
            return;
        }

    } catch (e) {
        console.error('Failed to fetch tree:', e);
        return;
    }

    const testUrls = [
        { name: 'PrettyName (No Page)', url: `https://www.migros.com.tr/rest/search/screens/${targetPrettyName}?reid=123` },
        { name: 'PrettyName (Page=1)', url: `https://www.migros.com.tr/rest/search/screens/${targetPrettyName}?reid=123&page=1` },
        { name: 'PrettyName (Page=2)', url: `https://www.migros.com.tr/rest/search/screens/${targetPrettyName}?reid=123&page=2` }
    ];

    for (const t of testUrls) {
        console.log(`\n--- Testing: ${t.name} ---`);
        console.log(`URL: ${t.url}`);
        try {
            const res = await fetch(t.url, { headers });
            console.log(`Status: ${res.status}`);
            if (res.ok) {
                const text = await res.text();
                // console.log('Response length:', text.length);
                const json = JSON.parse(text);

                // Check items
                const items = json.data?.storeProductInfos || json.data?.searchInfo?.storeProductInfos || [];
                console.log(`Items found: ${items.length}`);

                if (items.length > 0) {
                    console.log(`First: ${items[0].name}`);
                    if (json.data.searchInfo?.pageCount) console.log(`PageCount: ${json.data.searchInfo.pageCount}`);
                    if (json.data.pageCount) console.log(`PageCount (Root): ${json.data.pageCount}`);
                } else {
                    console.log('No metadata or items found.');
                    if (json.data) console.log('Data Keys:', Object.keys(json.data));
                }
            } else {
                console.log(`Failed: ${res.status}`);
            }
        } catch (e: any) {
            console.error('Failed:', e.message || e);
        }
    }
}

testCategoryFetch();
