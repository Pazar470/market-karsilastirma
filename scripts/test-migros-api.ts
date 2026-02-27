
import { scrapeMigrosAPI } from '../lib/scraper/migros-api';

async function test() {
    try {
        console.log('Testing Migros API Scraper...');
        const products = await scrapeMigrosAPI();

        console.log(`\n--- Summary ---`);
        console.log(`Total Products Fetched: ${products.length}`);

        if (products.length > 0) {
            console.log('Sample Product:', products[0]);
            console.log('Sample Product (Mid):', products[Math.floor(products.length / 2)]);

            // Analyze categories
            const cats = new Set(products.map(p => p.category));
            console.log(`Unique Categories Found: ${cats.size}`);
            console.log('First 5 Categories:', Array.from(cats).slice(0, 5));
        }

    } catch (e) {
        console.error('Test Failed:', e);
    }
}

test();
