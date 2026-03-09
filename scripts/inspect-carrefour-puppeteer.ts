
import puppeteer from 'puppeteer';
import * as fs from 'fs';

async function inspect() {
    console.log('Launching Puppeteer for Carrefour (Category Probe Robust)...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--window-size=1920,1080']
    });
    const page = await browser.newPage();

    try {
        console.log('Navigating to Carrefour Home first...');
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        await page.goto('https://www.carrefoursa.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log('Home loaded. Waiting 2s...');
        await new Promise(r => setTimeout(r, 2000));

        console.log('Trying to fetch Category Sitemap...');
        await page.goto('https://www.carrefoursa.com/csaSitemaps/category-tr-try', { waitUntil: 'networkidle0', timeout: 30000 });

        // Extract straight text (handling XML viewer wrapping)
        const sitemapContent = await page.evaluate(() => document.body.innerText);

        // Match Category URL
        // Pattern: https://www.carrefoursa.com/{slug}-c-{id}
        const regex = /https:\/\/www\.carrefoursa\.com\/[a-zA-Z0-9-]+-c-\d+/g;
        const matches = sitemapContent.match(regex);

        if (matches && matches.length > 0) {
            // Pick index 10 to avoid "campaign" categories or top levels which might be landing pages
            const index = Math.min(10, matches.length - 1);
            const categoryUrl = matches[index];
            console.log(`Found ${matches.length} matches. Visiting: ${categoryUrl}`);

            console.log('Navigating to Category Page...');
            await page.goto(categoryUrl, { waitUntil: 'networkidle2', timeout: 60000 });

            // Wait for product listing
            try {
                await page.waitForSelector('.product-listing-item', { timeout: 10000 });
                console.log('Product listing found!');
            } catch (e) {
                console.log('Selector .product-listing-item timeout...');
            }

            const content = await page.content();
            fs.writeFileSync('carrefour_category_dump.html', content);
            console.log(`Saved Category dump (${content.length} bytes)`);

        } else {
            console.log('No category URL found in sitemap text.');
            // Dump the text to see what we got
            fs.writeFileSync('carrefour_category_sitemap_text.txt', sitemapContent);
        }

    } catch (e) {
        console.error('Puppeteer Error:', e);
        await page.screenshot({ path: 'carrefour_crash.png' });
    } finally {
        await browser.close();
    }
}

inspect();
