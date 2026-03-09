
import puppeteer from 'puppeteer';

async function checkUrl(url: string, name: string) {
    console.log(`Checking ${name} (${url})...`);
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        const title = await page.title();
        console.log(`Title: ${title}`);

        // Check for common grocery terms
        const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
        const hasMilk = bodyText.includes('süt');
        const hasEgg = bodyText.includes('yumurta');
        const hasPrice = bodyText.includes('tl');

        console.log(`Contains 'süt': ${hasMilk}`);
        console.log(`Contains 'yumurta': ${hasEgg}`);
        console.log(`Contains 'tl': ${hasPrice}`);

        // Check for "Select Location" modal
        const hasLocationModal = bodyText.includes('konum') || bodyText.includes('teslimat adresi');
        console.log(`Possible Location Modal: ${hasLocationModal}`);

        // Try to list a few products with existing selectors
        const products = await page.evaluate(() => {
            const items = document.querySelectorAll('div[id^="product-card-"]');
            return Array.from(items).slice(0, 3).map(i => i.querySelector('h3')?.textContent?.trim());
        });
        console.log('Sample Products (using existing selector):', products);

    } catch (error) {
        console.error(`Error checking ${name}:`, error);
    } finally {
        await browser.close();
    }
}

(async () => {
    // Check Market (Current)
    await checkUrl('https://www.a101.com.tr/market', 'A101 Market');
    console.log('-'.repeat(20));
    // Check Kapıda (Proposed)
    await checkUrl('https://www.a101.com.tr/kapida', 'A101 Kapıda');
})();
