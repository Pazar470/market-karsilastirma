
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function fetchA101Menu() {
    console.log('Fetching A101 Market Home to find Category IDs...');
    const url = 'https://www.a101.com.tr/market';

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!res.ok) {
            console.error(`Failed: ${res.status}`);
            return;
        }

        const html = await res.text();
        const $ = cheerio.load(html);

        console.log('Scanning for ANY /market links...');

        let count = 0;
        $('a[href^="/market"]').each((_, el) => {
            if (count < 20) {
                console.log('Link:', $(el).attr('href'));
                count++;
            }
        });

    } catch (e) {
        console.error('Error fetching HTML:', e);
    }

    console.log('\n--- Testing API Endpoint: SEARCH (domates) ---');
    try {
        const searchUrl = 'https://rio.a101.com.tr/dbmk89vnr/CALL/Store/search/VS032?q=domates&channel=SLOT&__culture=tr-TR&__platform=web&data=e30%3D';
        const res = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://www.a101.com.tr',
            }
        });

        if (res.ok) {
            const json: any = await res.json();
            console.log('Search Status:', res.status);

            // Try to find products
            let products = [];
            if (json.data && Array.isArray(json.data)) products = json.data;

            console.log(`Found ${products.length} products for "domates"`);

            if (products.length > 0) {
                const p = products[0];
                console.log(`Product: ${p.name} (${p.id})`);
                console.log('Categories:', JSON.stringify(p.categories, null, 2));
                console.log('Attributes Category:', p.attributes?.category);
            }
        } else {
            console.log('Search Failed:', res.status);
        }

    } catch (e) {
        console.error('Search API Error:', e);
    }
}
fetchA101Menu();
