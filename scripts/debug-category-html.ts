
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

(async () => {
    console.log('Debugging Kapıda Category (Retry)...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        const url = 'https://www.a101.com.tr/kapida/meyve-sebze';
        console.log(`Navigating to ${url}...`);

        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        } catch (e) {
            console.log('Navigation timeout/error, trying to proceed extracting content...');
        }

        // Wait a bit for JS
        await new Promise(r => setTimeout(r, 5000));

        // Take screenshot
        const screenshotPath = path.resolve(__dirname, '../debug-kapida.png');
        await page.screenshot({ path: screenshotPath });
        console.log(`Saved screenshot to ${screenshotPath}`);

        // Dump HTML
        const html = await page.content();
        const htmlPath = path.resolve(__dirname, '../debug-kapida.html');
        fs.writeFileSync(htmlPath, html);
        console.log(`Saved HTML to ${htmlPath} (${html.length} bytes)`);

        // Log potential product selectors
        const productCount = await page.evaluate(() => {
            return document.querySelectorAll('div[id^="product-card-"]').length;
        });
        console.log(`Found ${productCount} items with 'product-card-' ID`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
})();
