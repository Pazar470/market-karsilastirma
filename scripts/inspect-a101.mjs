import puppeteer from 'puppeteer';
import fs from 'fs/promises';

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Set user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('Navigating to A101...');
    // Direct category link - often simpler
    await page.goto('https://www.a101.com.tr/market/sut-kahvaltilik', { waitUntil: 'networkidle2' });

    console.log('Page loaded. Saving HTML...');
    const html = await page.content();
    await fs.writeFile('a101-dump.html', html);

    console.log('Done!');
    await browser.close();
})();
