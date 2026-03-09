
import puppeteer from 'puppeteer';
import fs from 'fs';

async function scrapeA101() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set User Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Viewport
    await page.setViewport({ width: 1280, height: 800 });

    const url = 'https://www.a101.com.tr/market/kahvaltilik-sut-urunleri/peynir';
    console.log(`Navigating to ${url}...`);

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        console.log('Page loaded.');
        const title = await page.title();
        console.log('Title:', title);

        // Take screenshot
        await page.screenshot({ path: 'a101-screenshot.png' });
        console.log('Screenshot saved.');

        // Get HTML
        const html = await page.content();
        fs.writeFileSync('a101-puppeteer-dump.html', html);
        console.log('HTML dumped.');

        // Extract links
        const links = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            return anchors
                .map(a => ({ text: a.innerText, href: a.href }))
                .filter(a => a.text.toLowerCase().includes('kaşar') || a.text.toLowerCase().includes('peynir'));
        });

        console.log('Found Links:', links.length);
        links.forEach(l => console.log(`- ${l.text}: ${l.href}`));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
}

scrapeA101();
