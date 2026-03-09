
import { scrapeMigros } from '../lib/scraper/migros';

async function test() {
    console.log('Testing Migros Scraper (Full Loop)...');
    // Note: This might take a while as it runs all categories.
    // For testing, we can modify the imported CATEGORIES or just run it and kill it if needed.
    // Or simpler: The scraper logs progress.
    const products = await scrapeMigros();
    console.log('Products found:', products.length);
    if (products.length > 0) {
        console.log('First Product:', JSON.stringify(products[0], null, 2));
    }
}

test();
