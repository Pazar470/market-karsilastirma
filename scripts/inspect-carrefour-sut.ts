
import puppeteer from 'puppeteer';

async function inspect() {
    const url = 'https://www.carrefoursa.com/sut-urunleri/c/1310';
    console.log(`Inspecting Süt: ${url}`);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--window-size=1920,1080']
    });
    const page = await browser.newPage();

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Extract links that match /c/
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href*="/c/"]'))
                .map(a => ({ text: a.textContent?.trim(), href: a.getAttribute('href') }))
                .filter(l => l.href?.includes('/c/13') && l.text?.length > 2); // Filter for 13XX IDs (Süt range likely)
        });

        console.log('Sub-categories found:');
        links.forEach(l => console.log(`${l.text}: ${l.href}`));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
}

inspect();
