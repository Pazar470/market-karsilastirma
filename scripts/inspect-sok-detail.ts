
import fetch from 'node-fetch';
import * as fs from 'fs';

async function inspect() {
    // Try Search Page URL (Alternative verification method)
    // The search page for "nivea soft" should list our product
    const url = 'https://www.sokmarket.com.tr/arama?q=nivea%20soft';

    console.log(`Fetching Search Page URL: ${url}...`);

    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        }
    });
    const html = await res.text();

    console.log(`Total length: ${html.length}`);

    fs.writeFileSync('sok_dump_search.html', html);
    console.log('Dumped HTML to sok_dump_search.html');

    // Check for Price in HTML
    // Pattern: 123,45 ₺ or similar
    // Also pattern: 123,45 TL
    const priceRegex = /(\d{1,3}(?:[.]\d{3})*(?:,\d{1,2})?)\s*(?:₺|TL)/gi;
    let m;
    let found = 0;
    while ((m = priceRegex.exec(html)) !== null) {
        console.log(`Found price pattern: ${m[0]}`);
        found++;
        if (found > 20) break;
    }

    if (found === 0) {
        console.log('No price patterns found via Regex.');
        console.log('Preview:', html.substring(0, 500));
    }
}

inspect();
