
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function verifySokKasar() {
    const slug = 'kasar-peynir-c-520';
    const url = `https://www.sokmarket.com.tr/${slug}`;
    console.log(`Fetching ${url}...`);

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            }
        });

        if (!res.ok) {
            console.error('Failed to fetch:', res.status);
            return;
        }

        const html = await res.text();
        const $ = cheerio.load(html);

        let validCount = 0;
        let invalidCount = 0;

        // Selector from sok-scraper-v2.ts: .CProductCard-module_title__u8bMW
        $('.CProductCard-module_title__u8bMW').each((i, el) => {
            const name = $(el).text().trim();
            const lower = name.toLowerCase();

            // Strict check
            if (lower.includes('kaşar') || lower.includes('tost peyniri') || lower.includes('dilimli')) {
                if (lower.includes('köfte') || lower.includes('pide')) {
                    console.log(`[INVALID] ${name}`);
                    invalidCount++;
                } else {
                    console.log(`[VALID] ${name}`);
                    validCount++;
                }
            } else {
                console.log(`[?] ${name}`);
            }
        });

        console.log(`\nSummary for ${slug}:`);
        console.log(`Valid: ${validCount}`);
        console.log(`Invalid: ${invalidCount}`);

    } catch (e) {
        console.error(e);
    }
}

verifySokKasar();
