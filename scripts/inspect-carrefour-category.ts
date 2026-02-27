
import puppeteer from 'puppeteer';
import * as fs from 'fs';

async function inspect() {
    const url = 'https://www.carrefoursa.com/meyve/c/1015';
    console.log(`Inspecting Category: ${url}`);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--window-size=1920,1080']
    });
    const page = await browser.newPage();

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        console.log('Navigating...');
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        console.log('Waiting for selectors...');
        try {
            // Try different selectors for product cards
            await page.waitForSelector('.product-listing-item', { timeout: 5000 });
            console.log('Found .product-listing-item');
        } catch (e) {
            console.log('Timeout .product-listing-item');
        }

        const content = await page.content();
        fs.writeFileSync('carrefour_cat_1015.html', content);
        console.log(`Saved dump (${content.length} bytes)`);

    } catch (e) {
        console.error('Error:', e);
        await page.screenshot({ path: 'carrefour_cat_error.png' });
    } finally {
        await browser.close();
    }
}

inspect();
