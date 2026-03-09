
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function verifySelector() {
    const url = 'https://www.sokmarket.com.tr/meyve-ve-sebze-c-20';
    console.log(`--- Verifying Selector on: ${url} ---`);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            console.error(`Failed: ${response.status}`);
            return;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // 1. Old Selector (Global)
        const allLinks = $('a[href*="-p-"]');
        console.log(`OLD Selector (Global) Count: ${allLinks.length}`);

        // 2. New Selector (Scoped)
        const scopedLinks = $('div[class*="PLPProductListing_PLPCardsWrapper"] a[href*="-p-"]');
        console.log(`NEW Selector (Scoped) Count: ${scopedLinks.length}`);

        console.log('\n--- Products in New Selector ---');
        scopedLinks.each((i, el) => {
            const href = $(el).attr('href');
            // Extract text roughly 
            const text = $(el).text().replace(/\s+/g, ' ').trim().substring(0, 50);
            console.log(`[${i}] ${text}... (${href})`);
        });

        console.log('\n--- items EXCLUDED by New Selector ---');
        // Find items in Global but NOT in Scoped
        // This is a naive check, but good enough for visual verification
        const scopedHrefs = new Set(scopedLinks.map((_, el) => $(el).attr('href')).get());

        let excludedCount = 0;
        allLinks.each((_, el) => {
            const href = $(el).attr('href');
            if (href && !scopedHrefs.has(href)) {
                const text = $(el).text().replace(/\s+/g, ' ').trim().substring(0, 50);
                console.log(`[EXCLUDED] ${text}... (${href})`);
                excludedCount++;
            }
        });

        console.log(`\nTotal Excluded: ${excludedCount}`);

    } catch (e) {
        console.error('Error:', e);
    }
}

verifySelector();
