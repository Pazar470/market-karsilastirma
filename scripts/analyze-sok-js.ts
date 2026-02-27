
import fetch from 'node-fetch';

async function analyzeJs() {
    const jsUrl = 'https://www.sokmarket.com.tr/_next/static/chunks/app/product-listing/page-55a0eea4e503d7f8.js';
    console.log(`Fetching ${jsUrl}...`);

    try {
        const res = await fetch(jsUrl);
        const text = await res.text();
        console.log(`Length: ${text.length}`);

        // Search for API patterns
        const patterns = [
            /api\/[\w\/-]+/g,
            /https:\/\/[\w.-]+\/api\/[\w\/-]+/g,
            /v1\/[\w\/-]+/g,
            /products/g,
            /search/g,
            /POST/g,
            /GET/g
        ];

        // Also looked for 'fetch(' or 'axios' or 'get('

        // Dumb substring search for common keywords
        const keywords = ['/api/', 'https://api.', 'wd7796', 'products', 'category', 'search'];

        keywords.forEach(kw => {
            let idx = text.indexOf(kw);
            while (idx !== -1) {
                console.log(`\nFound '${kw}' at index ${idx}`);
                // Get 200 chars context
                const start = Math.max(0, idx - 100);
                const end = Math.min(text.length, idx + 200);
                console.log('Context:', text.substring(start, end));

                // Find next
                idx = text.indexOf(kw, idx + 1);
            }
        });

    } catch (e) {
        console.error(e);
    }
}

analyzeJs();
