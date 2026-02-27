
import fetch from 'node-fetch';

async function discoverSok() {
    console.log('--- Discovering Şok API ---');

    // Common Next.js / API patterns
    const endpoints = [
        'https://www.sokmarket.com.tr/api/products',
        'https://www.sokmarket.com.tr/api/categories',
        'https://www.sokmarket.com.tr/_next/data/build-id/index.json', // Next.js data route pattern (hard to guess build-id)
        'https://api.sokmarket.com.tr/api/v1/products', // separated host?
        'https://wd7796.sokmarket.com.tr/api' // sometimes they use subdomains
    ];

    // Try to find a build ID from the main page if possible
    try {
        const home = await fetch('https://www.sokmarket.com.tr');
        const html = await home.text();
        const buildIdMatch = html.match(/"buildId":"(.*?)"/);
        if (buildIdMatch) {
            console.log('Found Build ID:', buildIdMatch[1]);
            endpoints.push(`https://www.sokmarket.com.tr/_next/data/${buildIdMatch[1]}/sut-ve-sut-urunleri-c-460.json`);
        }
    } catch (e) { }

    for (const ep of endpoints) {
        try {
            console.log(`Checking ${ep}...`);
            const res = await fetch(ep, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                }
            });
            if (res.ok) {
                const contentType = res.headers.get('content-type');
                if (contentType && contentType.includes('json')) {
                    console.log(`✅ SUCCESS (JSON): ${ep}`);
                    const json = await res.json();
                    console.log('Keys:', Object.keys(json));
                    return;
                } else {
                    console.log(`⚠ SUCCESS (But not JSON): ${ep}`);
                }
            } else {
                console.log(`❌ Failed: ${res.status}`);
            }
        } catch (e) {
            console.log(`❌ Error: ${e.message}`);
        }
    }
}

discoverSok();
