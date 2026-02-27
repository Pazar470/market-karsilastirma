
import puppeteer from 'puppeteer';

async function run() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        console.error('Navigating to Carrefour to find categories...');
        // Going to sitemap or main page
        // Carrefour sitemap is sometimes good
        // Or just the main menu
        await page.goto('https://www.carrefoursa.com', { waitUntil: 'domcontentloaded' });

        // Wait for menu
        // Often .category-menu > ul > li > a
        // Or specific links in header

        // Let's try to find all links with /c/XXXX format 
        // This is a robust heuristic

        await page.waitForSelector('a[href*="/c/"]', { timeout: 10000 });

        const categories = await page.evaluate(() => {
            const seen = new Set();
            const results: any[] = [];

            document.querySelectorAll('a[href*="/c/"]').forEach((el: any) => {
                const href = el.href;
                const text = el.innerText.trim();

                // Filter out obviously bad ones (filters, specialized pages)
                // Keep mainly category pages
                if (href.includes('/c/') && text.length > 2 && !seen.has(href)) {
                    // Check if it looks like a main category ID (number at end)
                    // /meyve-sebze/c/1015
                    if (href.match(/\/c\/\d+$/)) {
                        seen.add(href);
                        results.push({ name: text, url: href });
                    }
                }
            });
            return results;
        });

        console.log(JSON.stringify(categories, null, 2));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
}

run();
