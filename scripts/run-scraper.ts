
import { scrapeA101 } from '../lib/scraper/a101';

(async () => {
    console.log('Starting A101 Scraper...');
    try {
        const products = await scrapeA101();
        console.log(`Successfully scraped ${products.length} products.`);
        if (products.length > 0) {
            console.log('Sample product:', products[0]);
        }
    } catch (error) {
        console.error('Scraping failed:', error);
    }
})();
