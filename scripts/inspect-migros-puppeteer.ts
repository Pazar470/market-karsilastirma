
import puppeteer from 'puppeteer';
import * as fs from 'fs';

async function inspect() {
    console.log('Launching Puppeteer...');
    // Launch browser
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Capture network requests
    page.on('request', request => {
        const url = request.url();
        if (url.includes('/rest/') || url.includes('migros.com.tr/api') || url.includes('search')) {
            console.log('REQUEST:', request.method(), url);
        }
    });

    try {
        console.log('Navigating to Migros...');
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Go to search page directly to trigger product API
        await page.goto('https://www.migros.com.tr/arama?q=sut', { waitUntil: 'networkidle0', timeout: 60000 });

        console.log('Page loaded!');
        const content = await page.content();
        fs.writeFileSync('migros_puppeteer_dump.html', content);
        console.log(`Saved HTML dump (${content.length} bytes)`);

    } catch (e) {
        console.error('Puppeteer Error:', e);
    } finally {
        await browser.close();
    }
}

inspect();
