
import puppeteer from 'puppeteer';

(async () => {
    console.log('Fetching A101 Kapıda Categories...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        await page.goto('https://www.a101.com.tr/kapida', { waitUntil: 'networkidle2', timeout: 60000 });

        const categories = await page.evaluate(() => {
            // Logic to find category links. 
            // Often in nav or sidebar. analyzing links with /kapida/ prefix
            const links = Array.from(document.querySelectorAll('a[href^="/kapida/"]'));
            return links
                .map(a => ({
                    text: a.textContent?.trim(),
                    href: a.getAttribute('href')
                }))
                .filter(c => c.text && c.href && c.href.split('/').length === 3); // Filter for top-level categories e.g. /kapida/meyve-sebze
        });

        // Deduplicate
        const uniqueCategories = new Map();
        categories.forEach(c => {
            if (!uniqueCategories.has(c.href)) {
                uniqueCategories.set(c.href, c.text);
            }
        });

        console.log('Found Categories:');
        uniqueCategories.forEach((text, href) => {
            console.log(`${text}: https://www.a101.com.tr${href}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
})();
