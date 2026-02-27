
import fetch from 'node-fetch';

async function discoverMigros() {
    console.log('--- Discovering Migros Categories ---');
    // Common endpoints
    const endpoints = [
        'https://www.migros.com.tr/rest/categories',
        'https://www.migros.com.tr/rest/users/login/categories', // sometimes public
        'https://www.migros.com.tr/rest/common/categories'
    ];

    // Also try to hit a category page and see if it returns JSON
    // e.g. https://www.migros.com.tr/meyve-sebze-c-2
    // often these have a clean API counterpart like /rest/products/search?categoryIds=2

    for (const ep of endpoints) {
        try {
            console.log(`Checking ${ep}...`);
            const res = await fetch(ep, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Content-Type': 'application/json',
                    'X-Pweb-Device-Type': 'DESKTOP'
                }
            });
            if (res.ok) {
                const json: any = await res.json();
                console.log(`✅ SUCCESS: ${ep}`);
                if (Array.isArray(json.data)) {
                    console.log(`Found ${json.data.length} root categories.`);
                    console.log('Sample:', json.data[0]);
                } else {
                    console.log('Keys:', Object.keys(json));
                }
                return; // Found one
            } else {
                console.log(`❌ Failed: ${res.status}`);
            }
        } catch (e) {
            console.log(`❌ Error: ${e.message}`);
        }
    }
}

discoverMigros();
