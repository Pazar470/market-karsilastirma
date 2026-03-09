
import fetch from 'node-fetch';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

async function checkUrl(url: string, description: string) {
    try {
        const res = await fetch(url, { headers: HEADERS });
        if (res.ok) {
            const ct = res.headers.get('content-type');
            if (ct && ct.includes('json')) {
                const json = await res.json();
                console.log(`[SUCCESS] ${description}: ${url}`);
                // console.log(JSON.stringify(json).substring(0, 200));

                // If it's verify helpful, maybe dump keys
                if (Array.isArray(json)) console.log(`  Is Array length: ${json.length}`);
                else if (json.data) console.log(`  Has .data field`);

                return json;
            } else {
                console.log(`[OK-HTML] ${description}: ${url} (${res.status})`);
            }
        } else {
            console.log(`[FAIL] ${description}: ${url} (${res.status})`);
        }
    } catch (e) {
        console.log(`[ERR] ${description}: ${url} - ${e.message}`);
    }
    return null;
}

async function main() {
    console.log('--- Probing Şok ---');
    await checkUrl('https://www.sokmarket.com.tr/api/categories', 'Sok API Categories');
    await checkUrl('https://www.sokmarket.com.tr/api/home/categories', 'Sok Home Categories');
    await checkUrl('https://api.sokmarket.com.tr/api/categories', 'Sok API Subdomain');
    // Try to find if we can get subcategories for Süt (c-460)
    await checkUrl('https://www.sokmarket.com.tr/api/categories/c-460', 'Sok Sut Category');

    console.log('\n--- Probing A101 ---');
    await checkUrl('https://www.a101.com.tr/api/categories', 'A101 API Categories');
    // A101 usually uses a different structure, maybe:
    // https://www.a101.com.tr/market/kahvaltilik-sut-urunleri/peynir/?page=1
}

main();
