
import { scrapeSok } from '../lib/scraper/sok';

async function test() {
    try {
        const products = await scrapeSok();
        console.log(`Scraped ${products.length} products.`);
        if (products.length > 0) {
            console.log('Sample Product:', products[0]);
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

test();
