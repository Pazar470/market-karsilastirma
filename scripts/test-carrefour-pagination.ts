
import puppeteer from 'puppeteer';

async function testPagination() {
    const urlBase = 'https://www.carrefoursa.com/meyve/c/1015';
    console.log(`Testing Pagination for: ${urlBase}`);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--window-size=1920,1080']
    });
    const page = await browser.newPage();

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        // Page 0 (Default)
        console.log('Navigating to Page 0...');
        await page.goto(`${urlBase}?q=%3Arelevance&page=0`, { waitUntil: 'networkidle2', timeout: 60000 });
        const products0 = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.product-listing-item .item-name')).map(el => el.textContent?.trim());
        });
        console.log(`Page 0: Found ${products0.length} products. First: ${products0[0]}`);

        // Page 1
        console.log('Navigating to Page 1...');
        await page.goto(`${urlBase}?q=%3Arelevance&page=1`, { waitUntil: 'networkidle2', timeout: 60000 });
        const products1 = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.product-listing-item .item-name')).map(el => el.textContent?.trim());
        });
        console.log(`Page 1: Found ${products1.length} products. First: ${products1[0]}`);

        if (products0[0] !== products1[0]) {
            console.log('SUCCESS: Pagination works via URL parameter!');
        } else {
            console.log('FAILURE: Products are identical. Pagination might require different handling.');
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
}

testPagination();
