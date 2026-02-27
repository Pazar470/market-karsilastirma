
import puppeteer from 'puppeteer';

(async () => {
    console.log('Checking Kapıda Category...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        // Try a likely category URL
        const url = 'https://www.a101.com.tr/kapida/sut-ve-kahvaltilik';
        console.log(`Navigating to ${url}...`);

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
        console.log(`Title: ${await page.title()}`);
        console.log(`URL: ${page.url()}`); // Check for redirect

        // Check for products
        const products = await page.evaluate(() => {
            const items = document.querySelectorAll('li, div[class*="product"]');
            // Generic search for product-like items
            // A101 usually uses `li` for grid items in some layouts or `div`
            return Array.from(items).length;
        });
        console.log(`Found ${products} potential product elements.`);

        const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 300));
        console.log('Body start:', bodyText);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
})();
