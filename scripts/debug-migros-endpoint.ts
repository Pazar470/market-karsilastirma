import fetch from 'node-fetch';

import { v4 as uuidv4 } from 'uuid';

async function debugEndpoint() {
    const reid = '92485059-8664-4066-880c-26d246014528';
    const base = 'https://www.migros.com.tr/rest/search/screens/products';

    // Control: q=Süt should find items (~30)
    // Test: q=Süt + Category Filter. If items < 30 (but > 0) or 0 (if category mismatch), then filter works.

    const catSut = '20000000001033'; // Süt
    const catMeyve = '20000000000002'; // Meyve

    const params = [
        `q=Süt&categoryIds=${catSut}`, // Match: Süt in Süt Category -> Should return items
        `q=Peynir&categoryIds=${catSut}`, // Mismatch: Cheese in Milk Category -> Should return 0
    ];

    const HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',
        'X-Pweb-Device-Type': 'DESKTOP'
    };

    for (const p of params) {
        const url = `${base}?${p}&reid=${reid}&page=1`;
        console.log(`Testing ${p}`);
        try {
            const res = await fetch(url, { headers: HEADERS });

            if (res.ok) {
                const json: any = await res.json();
                const items = json.data?.searchInfo?.storeProductInfos || [];
                console.log(`✅ Status 200. Found ${items.length} items.`);
                if (items.length > 0) console.log('Sample:', items[0].name);
            } else {
                console.log(`❌ Failed: ${res.status}`);
            }
        } catch (e: any) {
            console.log(`❌ Error: ${e.message}`);
        }
        console.log('-'.repeat(20));
        await new Promise(r => setTimeout(r, 500));
    }
}

debugEndpoint();
