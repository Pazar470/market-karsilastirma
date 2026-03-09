import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { parseUnit } from '../unit-parser';
import { isProductValid } from '../product-sanity-check';

interface ScrapedProduct {
    name: string;
    price: number;
    imageUrl: string;
    link: string;
    store: 'Şok';
    category: string;
    quantityAmount?: number;
    quantityUnit?: string;
}

export const CATEGORIES = [
    { name: 'Yemeklik Malzemeler', url: 'https://www.sokmarket.com.tr/yemeklik-malzemeler-c-1770' },
    { name: 'Et & Tavuk & Şarküteri', url: 'https://www.sokmarket.com.tr/et-ve-tavuk-ve-sarkuteri-c-160' },
    { name: 'Meyve & Sebze', url: 'https://www.sokmarket.com.tr/meyve-ve-sebze-c-20' },
    { name: 'Süt & Süt Ürünleri', url: 'https://www.sokmarket.com.tr/sut-ve-sut-urunleri-c-460' },
    { name: 'Kahvaltılık', url: 'https://www.sokmarket.com.tr/kahvaltilik-c-890' },
    { name: 'Atıştırmalıklar', url: 'https://www.sokmarket.com.tr/atistirmaliklar-c-20376' },
    { name: 'İçecek', url: 'https://www.sokmarket.com.tr/icecek-c-20505' },
    { name: 'Ekmek & Pastane', url: 'https://www.sokmarket.com.tr/ekmek-ve-pastane-c-1250' }, // Updated Name
    { name: 'Dondurulmuş Ürünler', url: 'https://www.sokmarket.com.tr/dondurulmus-urunler-c-1550' },
    { name: 'Dondurma', url: 'https://www.sokmarket.com.tr/dondurma-c-31102' },
    { name: 'Temizlik', url: 'https://www.sokmarket.com.tr/temizlik-c-20647' },
    { name: 'Kağıt Ürünler', url: 'https://www.sokmarket.com.tr/kagit-urunler-c-20875' },
    { name: 'Kişisel Bakım & Kozmetik', url: 'https://www.sokmarket.com.tr/kisisel-bakim-ve-kozmetik-c-20395' },
    { name: 'Anne - Bebek & Çocuk', url: 'https://www.sokmarket.com.tr/anne-bebek-ve-cocuk-c-20634' }, // Updated Name
    { name: 'Oyuncak', url: 'https://www.sokmarket.com.tr/oyuncak-c-20644' },
    { name: 'Ev & Yaşam', url: 'https://www.sokmarket.com.tr/ev-ve-yasam-c-20898' },
    { name: 'Evcil Dostlar', url: 'https://www.sokmarket.com.tr/evcil-dostlar-c-20880' },
    { name: 'Giyim & Aksesuar', url: 'https://www.sokmarket.com.tr/giyim-ayakkabi-ve-aksesuar-c-20886' }, // Updated Name
    { name: 'Elektronik', url: 'https://www.sokmarket.com.tr/elektronik-c-22769' }
];

export async function scrapeSok(): Promise<ScrapedProduct[]> {
    console.log('Starting Şok scraper...');
    let allProducts: ScrapedProduct[] = [];

    // 1. Discover Subcategories dynamically from the main categories
    // This allows us to find specific leaf categories like "Kaşar Peyniri"
    const subCategoriesToScrape: { name: string, url: string, path: string }[] = [];

    console.log('Discovering detailed categories...');

    // Helper to fetch subs from a parent
    for (const parentCat of CATEGORIES) {
        try {
            const res = await fetch(parentCat.url);
            if (!res.ok) continue;
            const html = await res.text();
            const $ = cheerio.load(html);

            // Extract subcategory links from the sidebar or top bar
            // Şok typically lists subcategories as links with -c- not matching parent exactly
            const seenUrls = new Set<string>();

            $('a[href*="-c-"]').each((i, element) => {
                const href = $(element).attr('href');
                const name = $(element).text().trim();

                if (href && name) {
                    const fullUrl = `https://www.sokmarket.com.tr${href}`;

                    // Filter logic:
                    if (fullUrl !== parentCat.url && !seenUrls.has(fullUrl)) {
                        seenUrls.add(fullUrl);
                        // Construct FULL PATH: "Süt Ürünleri > Kaşar Peyniri"
                        const fullPath = `${parentCat.name} > ${name}`;

                        // Push to queue if not already there
                        if (!subCategoriesToScrape.find(c => c.url === fullUrl)) {
                            subCategoriesToScrape.push({ name, url: fullUrl, path: fullPath });
                        }
                    }
                }
            });

        } catch (e) {
            console.error(`Error discovering subs for ${parentCat.name}:`, e);
        }
        // Polite delay
        await new Promise(r => setTimeout(r, 200));
    }

    console.log(`Discovered ${subCategoriesToScrape.length} sub-categories. Merging with original list...`);

    // Merge original categories (as fallbacks or parents) and discovered ones
    // We prioritize discovered ones because they are likely more specific.
    // Actually, let's just use the discovered ones + originals that weren't discovered.
    const finalQueue: { name: string, url: string, path: string }[] = [];

    // Add originals first (as roots)
    CATEGORIES.forEach(c => {
        finalQueue.push({ ...c, path: c.name });
    });

    // Add subs (they might duplicate URLs, effectively overriding or appending)
    // To be cleaner: If a sub URL exists in roots, update its path? 
    // Or just push everything and let the scraper handle it. 
    // Simpler: Just append subs.
    subCategoriesToScrape.forEach(sub => {
        // If this URL is already in queue (e.g. it was a root), update its path to be more specific?
        // Or just add it.
        const existing = finalQueue.find(q => q.url === sub.url);
        if (existing) {
            // If existing was a root, maybe keep it? Or replace?
            // Let's just add the sub as a new entry.
        } else {
            finalQueue.push(sub);
        }
    });

    console.log(`Final Scrape Queue: ${finalQueue.length} categories.`);

    // 2. Scrape the Queue
    for (const cat of finalQueue) {
        let page = 1;
        const MAX_PAGES = 50; // Increased depth
        let hasMore = true;

        console.log(`Scraping category: ${cat.name} (${cat.url})`);

        while (hasMore && page <= MAX_PAGES) {
            const url = `${cat.url}?page=${page}`;

            try {
                const response = await fetch(url);
                if (!response.ok) {
                    console.error(`Failed to fetch ${url}: ${response.status}`);
                    break;
                }
                const html = await response.text();
                const $ = cheerio.load(html);

                let pageProductsCount = 0;

                // Scoped selector to avoid "Recommended Products" widgets
                $('div[class*="PLPProductListing_PLPCardsWrapper"] a[href*="-p-"]').each((_, element) => {
                    const href = $(element).attr('href');

                    // Extract text with spaces between elements to prevent concatenation
                    let text = '';
                    const getTextWithSpaces = (elem: any) => {
                        $(elem).contents().each((_: any, node: any) => {
                            if (node.type === 'text') {
                                text += $(node).text().trim() + ' ';
                            } else if (node.type === 'tag' && node.name !== 'script' && node.name !== 'style') {
                                getTextWithSpaces(node);
                            }
                        });
                    };
                    getTextWithSpaces(element);
                    text = text.replace(/\s+/g, ' ').trim();

                    if (href && text) {
                        // Strict Regex: Requires TL or ₺ symbol
                        const priceRegex = /(?<!\d)(\d{1,3}(?:[.]\d{3})*(?:,\d{1,2})?)\s*(?:₺|TL)/gi;
                        const matches = text.match(new RegExp(priceRegex));

                        let price = 0;
                        let name = text;

                        if (matches && matches.length > 0) {
                            const priceStr = matches[matches.length - 1]; // Last match usually correct
                            const cleanPrice = priceStr.toLowerCase().replace('₺', '').replace('tl', '').trim();
                            const normalizedPrice = cleanPrice.replace(/\./g, '').replace(',', '.');
                            price = parseFloat(normalizedPrice);

                            // Clean name
                            matches.forEach(m => {
                                name = name.replace(m, '').trim();
                            });
                            name = name.replace(/₺/g, '').replace(/tl/gi, '').trim();
                            name = name.replace(/\s\d+([.,]\d+)?$/, '').trim();
                        }

                        const img = $(element).find('img').attr('src');

                        if (name && price > 0) {
                            const unitInfo = parseUnit(name);

                            // Check for redundancy:
                            // We might scrape the same product from 'Süt' and 'Peynir'.
                            // We should handle upsert logic in the seeding phase, 
                            // but here we just collect. 
                            // *Modification*: Since 'cat.name' is now specific (e.g. "Kaşar Peyniri"),
                            // we are giving it the CORRECT category.

                            // SANITY CHECK: Block trash (Keychains in Fruit, etc.)
                            if (isProductValid(name, cat.path, price)) {
                                allProducts.push({
                                    name,
                                    price,
                                    imageUrl: img || '',
                                    link: `https://www.sokmarket.com.tr${href}`,
                                    store: 'Şok',
                                    category: cat.path, // Use the full path!
                                    quantityAmount: unitInfo?.amount,
                                    quantityUnit: unitInfo?.unit
                                });
                                pageProductsCount++;
                            } else {
                                // console.log(`Blocked Anomaly: ${name} in ${cat.path}`);
                            }
                        }
                    }
                });

                if (pageProductsCount === 0) {
                    hasMore = false;
                } else {
                    // console.log(`   Page ${page}: ${pageProductsCount} items.`);
                    page++;
                    await new Promise(r => setTimeout(r, 300));
                }

            } catch (err) {
                console.error(`Error on page ${page} of ${cat.name}:`, err);
                hasMore = false;
            }
        }
    }

    console.log(`Total items scraped from Şok: ${allProducts.length}`);
    return allProducts;
}
