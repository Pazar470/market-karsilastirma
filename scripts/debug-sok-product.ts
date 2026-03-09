
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const URL = 'https://www.sokmarket.com.tr/anadolu-ciftligi-gezen-tavuk-yumurta-m-10-lu-53-62-p-6449';

async function debugProduct() {
    console.log(`Fetching ${URL}...`);
    const response = await fetch(URL);
    const html = await response.text();
    const $ = cheerio.load(html);

    console.log('--- HTML Snippet around Price ---');
    // Sok usually puts price in a div with specific classes. 
    // Let's dump text content of price-like elements.

    // Attempt 1: Look for common price classes or just dump text containing '₺' or 'TL'
    $('div, span, p').each((i, el) => {
        const text = $(el).text().trim();
        if ((text.includes('₺') || text.includes('TL')) && text.length < 50) {
            console.log(`Found Price-like element <${el.tagName}>: "${text}"`);
        }
    });

    // Attempt 2: Run the ACTUAL regex used in scraper
    console.log('--- Regex Test ---');

    // Simulate the scraper's "text" extraction. 
    // In `sok.ts`, we iterate strictly over `a[href*="-p-"]`.
    // But here we are on the Detail Page?
    // Wait, the scraper `seed-sok.ts` iterates over listing pages. 
    // Let's verify if this product appears in a listing page and how it looks there.
    // The previous check said market: Şok. 
    // Does the seed script visit detail pages? No, `sok.ts` iterates category pages.

    // So we need to fetch the Category Page where this product appears.
    // "Et ve Tavuk ve Şarküteri" -> "Yumurta"
    // URL: https://www.sokmarket.com.tr/yumurta-c-165
    // But `sok.ts` uses higher level categories. 
    // 'Et & Tavuk & Şarküteri' url: 'https://www.sokmarket.com.tr/et-ve-tavuk-ve-sarkuteri-c-160'

    const CAT_URL = 'https://www.sokmarket.com.tr/et-ve-tavuk-ve-sarkuteri-c-160?page=1';
    console.log(`Fetching Category Page: ${CAT_URL}`);
    const catRes = await fetch(CAT_URL);
    const catHtml = await catRes.text();
    const $cat = cheerio.load(catHtml);

    $cat('a[href*="-p-6449"]').each((i, el) => {
        console.log('--- Found Product Card in Category Page ---');

        let text = '';
        const getTextWithSpaces = (elem: any) => {
            $cat(elem).contents().each((_: any, node: any) => {
                if (node.type === 'text') {
                    text += $cat(node).text().trim() + ' ';
                } else if (node.type === 'tag' && node.name !== 'script' && node.name !== 'style') {
                    getTextWithSpaces(node);
                }
            });
        };
        getTextWithSpaces(el);
        text = text.replace(/\s+/g, ' ').trim();

        console.log(`Full Card Text: "${text}"`);

        // Run scraper logic
        // Strict Regex: Requires TL or ₺ symbol, AND negative lookbehind to ensure we don't catch suffix numbers
        // Matches: 123,45₺ or 1.234,50 TL
        // Captures group 1: the number part
        const priceRegex = /(?<!\d)(\d{1,3}(?:[.]\d{3})*(?:,\d{1,2})?)\s*(?:₺|TL)/gi;
        const matches = text.match(new RegExp(priceRegex));
        console.log('Regex Matches:', matches);

        if (matches && matches.length > 0) {
            const priceStr = matches[matches.length - 1]; // Last match logic
            console.log(`Selected Price String (Last Match): "${priceStr}"`);

            const cleanPrice = priceStr.toLowerCase().replace('₺', '').replace('tl', '').trim();
            const normalizedPrice = cleanPrice.replace(/\./g, '').replace(',', '.');
            console.log(`Parsed Price: ${parseFloat(normalizedPrice)}`);
        }
    });

}

debugProduct();
