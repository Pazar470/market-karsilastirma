
import fetch from 'node-fetch';

async function probeSok() {
    const url = 'https://www.sokmarket.com.tr/peynir-c-469'; // Guessing subcategory based on main C-460
    // Actually let's try to fetch the main parent and see if we can find links
    const parentUrl = 'https://www.sokmarket.com.tr/sut-ve-sut-urunleri-c-460';

    console.log(`Fetching ${parentUrl}...`);
    const res = await fetch(parentUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });

    const html = await res.text();

    // Look for Next.js data
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
    if (match) {
        console.log('Found NEXT_DATA!');
        try {
            const data = JSON.parse(match[1]);
            // Navigate to find categories
            // Usually in props.pageProps.initialState... or similar
            console.log('Keys:', Object.keys(data.props.pageProps));

            // Try to find category tree
            // Dump to file if needed
            const fs = require('fs');
            fs.writeFileSync('sok-next-data.json', JSON.stringify(data, null, 2));
            console.log('Saved to sok-next-data.json');

        } catch (e) {
            console.error('Error parsing JSON:', e);
        }
    } else {
        console.log('No NEXT_DATA found.');
    }
}

probeSok();
