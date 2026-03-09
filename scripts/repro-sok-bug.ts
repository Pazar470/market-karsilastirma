
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function reproBug() {
    // URL for Giyim Ayakkabı category where the shoe likely is
    const url = 'https://www.sokmarket.com.tr/giyim-ayakkabi-ve-aksesuar-c-20886';

    console.log(`Fetching ${url}...`);
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    console.log('Searching for "Letoon"...');

    // Debug specific product card text
    $('a[href*="-p-"]').each((_, element) => {
        const text = $(element).text().trim();
        if (text.includes('Letoon')) {
            console.log('\n--- Found Suspect Product ---');
            console.log('Raw Text:', text);

            // Regex from sok.ts
            const priceRegex = /(\d{1,4}(?:[.,]\d{0,2})?)\s*₺?/;
            const matches = text.match(new RegExp(priceRegex, 'g'));

            console.log('Regex Matches:', matches);

            if (matches && matches.length > 0) {
                const priceStr = matches[matches.length - 1];
                console.log('Last Match (Used format):', priceStr);

                const cleanPrice = priceStr.toLowerCase().replace('₺', '').replace('tl', '').trim();
                console.log('Clean Price String:', cleanPrice);

                const price = parseFloat(cleanPrice.replace(',', '.'));
                console.log('Parsed Price:', price);
            }
        }
    });
}

reproBug();
