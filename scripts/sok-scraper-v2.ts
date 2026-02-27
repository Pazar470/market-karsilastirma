
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { parseUnit } from '../lib/unit-parser';
import { pathToFileURL } from 'url';

export interface ScrapedProduct {
    name: string;
    price: number;
    imageUrl: string;
    link: string;
    store: 'Şok';
    category: string;
    quantityAmount?: number;
    quantityUnit?: string;
}

// Validated Main Categories that return SSR HTML
export const SOK_CATEGORIES = [
    { name: 'Süt ve Süt Ürünleri', url: 'https://www.sokmarket.com.tr/sut-ve-sut-urunleri-c-460' },
    { name: 'Meyve ve Sebze', url: 'https://www.sokmarket.com.tr/meyve-ve-sebze-c-20' },
    { name: 'Et ve Tavuk ve Şarküteri', url: 'https://www.sokmarket.com.tr/et-ve-tavuk-ve-sarkuteri-c-160' },
    { name: 'Yemeklik Malzemeler', url: 'https://www.sokmarket.com.tr/yemeklik-malzemeler-c-1770' },
    { name: 'Kahvaltılık', url: 'https://www.sokmarket.com.tr/kahvaltilik-c-890' },
    { name: 'Ekmek ve Pastane', url: 'https://www.sokmarket.com.tr/ekmek-ve-pastane-c-1250' },
    { name: 'Dondurulmuş Ürünler', url: 'https://www.sokmarket.com.tr/dondurulmus-urunler-c-1550' },
    { name: 'İçecek', url: 'https://www.sokmarket.com.tr/icecek-c-20505' },
    { name: 'Atıştırmalıklar', url: 'https://www.sokmarket.com.tr/atistirmaliklar-c-20376' },
    { name: 'Temizlik', url: 'https://www.sokmarket.com.tr/temizlik-c-20647' },
    { name: 'Kağıt Ürünler', url: 'https://www.sokmarket.com.tr/kagit-urunler-c-20875' },
    { name: 'Kişisel Bakım & Kozmetik', url: 'https://www.sokmarket.com.tr/kisisel-bakim-ve-kozmetik-c-20395' },
    { name: 'Ev & Yaşam', url: 'https://www.sokmarket.com.tr/ev-ve-yasam-c-20898' },
];

export async function scrapeSokV2(): Promise<ScrapedProduct[]> {
    console.log('--- Starting Şok Scraper V2 (Hybrid + Discovery) ---');
    const allProducts: ScrapedProduct[] = [];
    const visitedUrls = new Set<string>();

    for (const mainCat of SOK_CATEGORIES) {
        console.log(`Discovering sub-categories for ${mainCat.name}...`);

        // Queue Start: Main Category
        const categoryQueue = [{ name: mainCat.name, url: mainCat.url }];

        // 1. Discovery Phase
        try {
            const res = await fetch(mainCat.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                }
            });
            if (res.ok) {
                const html = await res.text();
                const $ = cheerio.load(html);

                // Find sub-category links (Sidebar or Filter)
                $('a[href*="-c-"]').each((i, el) => {
                    const href = $(el).attr('href');
                    const name = $(el).text().trim();
                    if (href && name) {
                        const fullUrl = `https://www.sokmarket.com.tr${href}`;
                        // Avoid duplicates and self
                        if (fullUrl !== mainCat.url && !visitedUrls.has(fullUrl)) {
                            // Only add if it belongs to the same parent hierarchy (contains -c-)
                            visitedUrls.add(fullUrl);
                            categoryQueue.push({ name, url: fullUrl });
                        }
                    }
                });
            }
        } catch (e) {
            console.error(`Discovery warning for ${mainCat.name}:`, e);
        }

        console.log(`  > Found ${categoryQueue.length - 1} sub-categories for ${mainCat.name}.`);

        // 2. Scraping Phase (Process Queue)
        for (const cat of categoryQueue) {
            console.log(`  Scraping ${cat.name}...`);
            let page = 1;
            const maxPages = 50;

            while (page <= maxPages) {
                const url = `${cat.url}?page=${page}`;
                try {
                    // Mimic Browser Headers
                    const res = await fetch(url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                            'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                        }
                    });

                    if (!res.ok) {
                        // 404 usually means end of pagination for that category
                        if (res.status === 404) {
                            break;
                        }
                        console.error(`Failed ${url}: ${res.status}`);
                        break;
                    }

                    const html = await res.text();
                    const $ = cheerio.load(html);

                    let foundOnPage = 0;

                    // Try to find ANY product link
                    $('a[href*="-p-"]').each((i, el) => {
                        const href = $(el).attr('href');
                        if (!href) return;

                        // Extract Text
                        const container = $(el);
                        let text = container.text().replace(/\s+/g, ' ').trim();

                        // Simple Price Extraction
                        const priceMatch = text.match(/(\d{1,3}(?:[.]\d{3})*(?:,\d{1,2})?)\s*(?:₺|TL)/i);

                        if (priceMatch) {
                            const priceStr = priceMatch[1].replace('.', '').replace(',', '.');
                            const price = parseFloat(priceStr);

                            // Name extraction
                            let name = text.replace(priceMatch[0], '').replace('Sepete Ekle', '').trim();
                            name = name.replace(/^\d+/, '').trim();

                            // Image
                            const img = container.find('img').attr('src') || '';

                            const unitInfo = parseUnit(name);

                            if (name && price > 0) {
                                allProducts.push({
                                    name,
                                    price,
                                    imageUrl: img,
                                    link: `https://www.sokmarket.com.tr${href}`,
                                    store: 'Şok',
                                    category: cat.name, // Use Specific Category Name
                                    quantityAmount: unitInfo?.amount,
                                    quantityUnit: unitInfo?.unit
                                });
                                foundOnPage++;
                            }
                        }
                    });

                    if (foundOnPage === 0) {
                        if (page === 1) {
                            // console.warn(`  !! Page 1 has 0 items for ${cat.name}.`);
                        }
                        break;
                    }

                    page++;
                    await new Promise(r => setTimeout(r, 200)); // Polite delay

                } catch (e) {
                    console.error(e);
                    break;
                }
            }
        }
    }

    // Deduplication by Link
    const uniqueProducts = Array.from(new Map(allProducts.map(item => [item.link, item])).values());

    console.log(`Total unique items scraped from Şok: ${uniqueProducts.length}`);
    return uniqueProducts;
}

// Execute directly if run as script
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    scrapeSokV2().catch(e => {
        console.error('Fatal Error:', e);
        process.exit(1);
    });
}
