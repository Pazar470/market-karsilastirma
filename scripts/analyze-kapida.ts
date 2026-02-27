
import puppeteer from 'puppeteer';

(async () => {
    console.log('Analyzing A101 Kapıda Structure...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    // Use desktop user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        await page.goto('https://www.a101.com.tr/kapida', { waitUntil: 'networkidle2', timeout: 60000 });

        const title = await page.title();
        console.log(`Page Title: ${title}`);

        // Dump logic of the modal or main content
        const bodyContent = await page.evaluate(() => {
            const body = document.body;
            // Check for potential modal classes
            const modals = document.querySelectorAll('[role="dialog"], .modal, [class*="popup"]');
            const modalTexts = Array.from(modals).map(m => m.textContent?.trim().substring(0, 100));

            return {
                textInit: body.innerText.substring(0, 200).replace(/\n/g, ' '),
                modals: modalTexts,
                hasLocationText: body.innerText.toLowerCase().includes('teslimat adresi') || body.innerText.toLowerCase().includes('konum'),
                buttons: Array.from(document.querySelectorAll('button')).slice(0, 5).map(b => b.innerText)
            };
        });

        console.log('Analysis:', bodyContent);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
})();
