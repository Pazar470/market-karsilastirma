
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function debugSokFruit() {
    console.log('--- Debugging Şok: Meyve & Sebze ---');
    // URL for Fruit & Veg
    const url = 'https://www.sokmarket.com.tr/meyve-ve-sebze-c-20';

    console.log(`Fetching: ${url}`);

    try {
        const res = await fetch(url);
        const html = await res.text();
        const $ = cheerio.load(html);

        let foundKeychain = false;

        // Look for product cards
        $('a[href*="-p-"]').each((i, el) => {
            const text = $(el).text().toLowerCase();
            const href = $(el).attr('href');

            if (text.includes('anahtarlık') || text.includes('fener')) {
                console.log(`!!! FOUND ANOMALY !!!`);
                console.log(`Text: ${$(el).text().trim()}`);
                console.log(`Link: ${href}`);
                foundKeychain = true;
            }
        });

        if (!foundKeychain) {
            console.log('No keychains found on Page 1. Checking if we can inspect the whole list...');
        }

    } catch (e) {
        console.error(e);
    }
}

debugSokFruit().catch(console.error);
