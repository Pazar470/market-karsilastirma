
import fetch from 'node-fetch';

async function analyzeJs() {
    // Try main app bundles where config usually lives
    const urls = [
        'https://www.sokmarket.com.tr/_next/static/chunks/main-app-fe8494148f0fcf10.js',
        'https://www.sokmarket.com.tr/_next/static/chunks/app/layout-30db9a78a93c620d.js'
    ];

    for (const jsUrl of urls) {
        console.log(`Fetching ${jsUrl}...`);

        try {
            const res = await fetch(jsUrl);
            const text = await res.text();
            console.log(`Length: ${text.length}`);

            // Dumb substring search for common keywords
            // Look for "BASE_URL" or "API_URL" or "https://api"
            const keywords = ['BASE_URL', 'API_URL', 'https://api.', 'wd7796', 'products', 'category'];

            keywords.forEach(kw => {
                let idx = text.indexOf(kw);
                while (idx !== -1) {
                    console.log(`\n[${jsUrl}] Found '${kw}' at index ${idx}`);
                    // Get 100 chars context
                    const start = Math.max(0, idx - 100);
                    const end = Math.min(text.length, idx + 150);
                    console.log('Context:', text.substring(start, end));

                    // Find next
                    idx = text.indexOf(kw, idx + 1);
                }
            });

        } catch (e) {
            console.error(e);
        }
    }
}

analyzeJs();
