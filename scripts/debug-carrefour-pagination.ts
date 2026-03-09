
import puppeteer from 'puppeteer';

async function run() {
    // Pick a category to test
    const URL = 'https://www.carrefoursa.com/meyve/c/1015'; // Fruit

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        // Page 1
        console.log(`Page 1: ${URL}`);
        await page.goto(URL, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.product-listing-item', { timeout: 10000 });
        let count1 = await page.evaluate(() => document.querySelectorAll('.product-listing-item').length);
        console.log(`Page 1 Items: ${count1}`);

        // Page 2 - Try generic param ?q=%3Arelevance&page=1
        // Carrefour typically uses ?q=:relevance&page=1 (0-indexed usually)
        // Or ?page=2
        const url2 = `${URL}?q=%3Arelevance&page=1`; // typically page=1 means 2nd page
        console.log(`Page 2 Attempt: ${url2}`);
        await page.goto(url2, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.product-listing-item', { timeout: 10000 });
        let count2 = await page.evaluate(() => document.querySelectorAll('.product-listing-item').length);
        console.log(`Page 2 Items: ${count2}`);

        // Page 3
        const url3 = `${URL}?q=%3Arelevance&page=2`;
        console.log(`Page 3 Attempt: ${url3}`);
        await page.goto(url3, { waitUntil: 'domcontentloaded' });
        let count3 = await page.evaluate(() => document.querySelectorAll('.product-listing-item').length);
        console.log(`Page 3 Items: ${count3}`);

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}

run();
