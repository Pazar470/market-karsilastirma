
import puppeteer, { Page } from 'puppeteer';

interface ScrapedProduct {
    name: string;
    price: number;
    imageUrl: string;
    link: string;
    store: 'Carrefour';
    category: string;
    quantityAmount?: number;
    quantityUnit?: string;
}


// Dynamic Category Discovery
async function discoverCategories(page: Page): Promise<{ name: string, url: string }[]> {
    console.log('Discovering categories from homepage...');
    try {
        await page.goto('https://www.carrefoursa.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
        // Wait a bit for menu to hydrate if needed, or just look for links
        await new Promise(r => setTimeout(r, 2000));

        const categories = await page.evaluate(() => {
            const seen = new Set<string>();
            const results: { name: string, url: string }[] = [];

            // Look for all links that match category pattern /c/NUMBER
            document.querySelectorAll('a[href*="/c/"]').forEach((el: any) => {
                const href = el.href;
                const text = el.innerText?.trim() || '';

                if (href && text.length > 2 && !seen.has(href)) {
                    // Strict pattern: ends with /c/digits
                    // This avoids filters like ?q=...
                    // But some categories might have ? params? Usually main cats don't.
                    if (/\/c\/\d+$/.test(href)) {
                        seen.add(href);
                        // Cleanup name
                        const cleanName = text.replace(/\s+/g, ' ').trim();
                        results.push({ name: cleanName, url: href });
                    }
                }
            });
            return results;
        });

        console.log(`Discovered ${categories.length} categories.`);
        return categories;
    } catch (e) {
        console.error('Error discovering categories:', e);
        return [];
    }
}

export async function scrapeCarrefour(): Promise<ScrapedProduct[]> {
    console.log('Starting Carrefour scraper...');
    const allProducts: ScrapedProduct[] = [];

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--window-size=1920,1080']
    });

    try {
        const page = await browser.newPage();

        // OPTIMIZATION: Block unnecessary resources
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Stealth settings
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        // Dynamic Discovery
        let categories = await discoverCategories(page);

        // Fallback if discovery fails
        if (categories.length === 0) {
            console.log('Discovery failed, using fallback list.');
            categories = [
                { name: 'Meyve, Sebze', url: 'https://www.carrefoursa.com/meyve-sebze/c/1014' },
                { name: 'Et, Balık', url: 'https://www.carrefoursa.com/et-balik-kumes/c/1044' },
                { name: 'Süt, Kahvaltılık', url: 'https://www.carrefoursa.com/sut-kahvaltilik/c/1113' },
                { name: 'Gıda, Şekerleme', url: 'https://www.carrefoursa.com/gida-sekerleme/c/1005' },
                { name: 'İçecekler', url: 'https://www.carrefoursa.com/icecekler/c/1532' },
                { name: 'Temizlik', url: 'https://www.carrefoursa.com/temizlik-urunleri/c/1556' },
                { name: 'Kişisel Bakım', url: 'https://www.carrefoursa.com/kisisel-bakim/c/1608' }
            ];
        }

        // Iterate Categories
        for (const cat of categories) {
            console.log(`Scraping Category: ${cat.name} (${cat.url})...`);

            const seenProducts = new Set<string>();
            let pageIndex = 0;
            let hasMore = true;

            while (hasMore) {
                const url = pageIndex === 0 ? cat.url : `${cat.url}?q=%3Arelevance&page=${pageIndex}`;
                console.log(`  Scraping ${cat.name} Page ${pageIndex + 1}...`);

                try {
                    // OPTIMIZATION: domcontentloaded is faster than networkidle2
                    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

                    // Wait for products to actually appear (or timeout if none)
                    try {
                        await page.waitForSelector('.product-listing-item', { timeout: 3000 });
                    } catch {
                        // Ignore timeout, handled by check below
                    }

                    // Check if products exist
                    const productCount = await page.evaluate(() => document.querySelectorAll('.product-listing-item').length);
                    if (productCount === 0) {
                        console.log(`  No products found on page ${pageIndex + 1}. Stopping.`);
                        hasMore = false;
                        break;
                    }

                    // Extract Products
                    const products = await page.evaluate((categoryName) => {
                        const items: any[] = [];
                        document.querySelectorAll('.product-listing-item').forEach(el => {
                            const name = el.querySelector('.item-name')?.textContent?.trim() || '';
                            const priceText = el.querySelector('.item-price')?.textContent?.trim() || '';
                            const link = el.querySelector('a')?.getAttribute('href') || '';
                            // Note: Blocking images might affect src, but data-src usually remains
                            const img = el.querySelector('img')?.getAttribute('data-src') || el.querySelector('img')?.getAttribute('src') || '';

                            // FIX: Price Parsing (Thousand separator logic)
                            // 1.234,50 TL -> remove . -> 1234,50 -> replace , -> 1234.50
                            const cleanPriceText = priceText.replace(' TL', '').trim();
                            const normalizedPriceText = cleanPriceText.replace(/\./g, '').replace(',', '.');
                            const price = parseFloat(normalizedPriceText.replace(/[^\d.]/g, '')) || 0;

                            // Parse Unit (basic)
                            let amount = 1;
                            let unit = 'adet';
                            const lowerName = name.toLowerCase();
                            if (lowerName.match(/\d+\s*(kg|g|l|ml)/)) {
                                const match = lowerName.match(/(\d+(?:,\d+)?)\s*(kg|g|l|ml)/);
                                if (match) {
                                    amount = parseFloat(match[1].replace(',', '.'));
                                    unit = match[2];
                                }
                            } else if (lowerName.includes(' kg')) {
                                unit = 'kg';
                            }

                            if (name && price > 0) {
                                items.push({
                                    name,
                                    price,
                                    imageUrl: img.startsWith('http') ? img : `https://www.carrefoursa.com${img}`,
                                    link: `https://www.carrefoursa.com${link}`,
                                    store: 'Carrefour',
                                    category: categoryName,
                                    quantityAmount: amount,
                                    quantityUnit: unit
                                });
                            }
                        });
                        return items;
                    }, cat.name);

                    // Check for duplicates to stop infinite loops if carrefour redirects valid page to same page
                    let newItems = 0;
                    for (const p of products) {
                        if (!seenProducts.has(p.link)) {
                            seenProducts.add(p.link);
                            allProducts.push(p);
                            newItems++;
                        }
                    }

                    console.log(`  Found ${products.length} items (${newItems} new).`);

                    if (newItems === 0) {
                        console.log('  No new items found (duplicate page?). Stopping.');
                        hasMore = false;
                    } else {
                        pageIndex++;
                        // Limit max pages to avoid infinite loop
                        if (pageIndex > 50) hasMore = false;
                    }

                } catch (err) {
                    console.error(`  Error on page ${pageIndex}:`, err);
                    hasMore = false;
                }
            }
        }
    } catch (e) {
        console.error('Carrefour Scraper Fatal Error:', e);
    } finally {
        await browser.close();
    }

    console.log(`Total Carrefour products scraped: ${allProducts.length}`);
    return allProducts;
}
