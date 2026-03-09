// Use global fetch
// I'll use the safe 'global fetch' approach
// const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function debugSokApi() {
    console.log('--- Probing Şok API ---');
    // Try Mobile API / BFF endpoints
    const endpoints = [
        'https://api.sokmarket.com.tr/api/products/search?q=portakal',
        'https://www.sokmarket.com.tr/api/products/search?q=portakal',
        'https://cepte.sokmarket.com.tr/api/v1/search?q=portakal'
    ];

    for (const url of endpoints) {
        try {
            console.log(`Trying ${url}...`);
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Origin': 'https://www.sokmarket.com.tr'
                }
            });
            if (res.ok) {
                console.log(`SUCCESS: ${url}`);
                const data = await res.json();
                console.log(JSON.stringify(data, null, 2).slice(0, 500));
            } else {
                console.log(`Failed: ${res.status}`);
            }
        } catch (e) {
            console.log(`Error ${url}:`, e.message);
        }
    }
}

// debugSokApi();
// Run with node
(async () => {
    await debugSokApi();
})();
