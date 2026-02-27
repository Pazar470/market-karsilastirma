
import fetch from 'node-fetch';

async function fuzz() {
    const catId = 20000000001033; // Süt
    const shortId = 1033;
    const hexId = '271d'; // Hex for 10013 (Dana Sucuk), let's use Süt ID.
    // 1033 is 0x409.

    const endpoints = [
        `https://www.migros.com.tr/rest/categories/${catId}/products`,
        `https://www.migros.com.tr/rest/categories/${catId}/search`,
        `https://www.migros.com.tr/rest/products?category_id=${catId}`,
        `https://www.migros.com.tr/rest/market/products?category_id=${catId}`,
        `https://www.migros.com.tr/rest/market/categories/${catId}/products`,
        `https://www.migros.com.tr/rest/list/screens/products?categoryIds=${catId}`,
        // Try 'common' wrapper
        `https://www.migros.com.tr/rest/common/products?categoryIds=${catId}`,
        // Try user wrapper
        `https://www.migros.com.tr/rest/users/login/products?categoryIds=${catId}`,

        // Try 'sub-category' URL pattern from prettyName
        `https://www.migros.com.tr/rest/sut-c-409/products`,
        `https://www.migros.com.tr/rest/sut-c-409`,

        // Try POST to search/screens/search again with slightly different body
        { url: 'https://www.migros.com.tr/rest/search/screens/search', method: 'POST', body: { categoryId: catId } },
        { url: 'https://www.migros.com.tr/rest/search/screens/search', method: 'POST', body: { categoryIds: [catId] } },
        { url: 'https://www.migros.com.tr/rest/search/screens/search', method: 'POST', body: { searchInfo: { categoryIds: [catId] } } }
    ];

    const HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',
        'X-Pweb-Device-Type': 'DESKTOP'
    };

    for (const ep of endpoints) {
        const url = typeof ep === 'string' ? ep : ep.url;
        const method = typeof ep === 'string' ? 'GET' : ep.method;
        const body = typeof ep === 'string' ? undefined : ep.body;

        console.log(`Testing ${method} ${url} ${body ? JSON.stringify(body) : ''}`);

        try {
            const opts: any = { headers: HEADERS, method };
            if (body) opts.body = JSON.stringify(body);

            const res = await fetch(url, opts);
            console.log(`Status: ${res.status}`);

            if (res.ok) {
                const json: any = await res.json();
                // analyze JSON
                const str = JSON.stringify(json);
                if (str.includes('storeProductInfos') || str.includes('products') || str.includes('Migros')) {
                    console.log('✅✅ POTENTIAL HIT!');
                    console.log(str.substring(0, 200));
                }
            }
        } catch (e) { }
        console.log('---');
        await new Promise(r => setTimeout(r, 200));
    }
}

fuzz();
