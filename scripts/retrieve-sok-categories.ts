
import puppeteer from 'puppeteer';

async function run() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        console.log('Navigating to Sok...');
        await page.goto('https://www.sokmarket.com.tr', { waitUntil: 'domcontentloaded' });

        // Wait for category menu (Desktop header usually has "Kategoriler" or explicit links)
        // Sok often has a sidebar or header menu.
        // Let's dump all links that look like categories

        // Selector might vary. Look for links with /c-XXXX format.

        await page.waitForSelector('a[href*="-c-"]', { timeout: 10000 });

        const links = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a[href*="-c-"]'));
            return anchors.map(a => ({
                text: a.innerText.trim(),
                href: a.href
            })).filter(l => l.text && l.href);
        });

        console.log(`Found ${links.length} category links.`);

        // Filter and deduplicate
        const unique = new Map();
        links.forEach(l => {
            if (!unique.has(l.href)) {
                unique.set(l.href, l.text);
            }
        });

        const categories: any[] = [];
        unique.forEach((text, href) => {
            categories.push({ name: text, url: href });
        });
        console.log(JSON.stringify(categories, null, 2));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
}

run();
