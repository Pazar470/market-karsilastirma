
import puppeteer from 'puppeteer';
import * as fs from 'fs';

async function discover() {
    console.log('Discovering Carrefour Categories from Homepage...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--window-size=1920,1080']
    });
    const page = await browser.newPage();

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        await page.goto('https://www.carrefoursa.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Wait for potential menu
        await new Promise(r => setTimeout(r, 5000));

        // Extract links from menu
        const categories = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href*="/c/"]'));
            return links.map(a => ({
                text: a.textContent?.trim() || '',
                href: a.getAttribute('href')
            })).filter(l => l.text.length > 2 && l.href && l.href.includes('/c/'));
        });

        console.log(`Found ${categories.length} category links.`);
        categories.forEach(c => console.log(`${c.text}: ${c.href}`));

        fs.writeFileSync('carrefour_discovered_categories.json', JSON.stringify(categories, null, 2));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
}

discover();
