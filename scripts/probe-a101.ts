
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs';

async function probeA101() {
    // URL for Cheese category
    const url = 'https://www.a101.com.tr/market/kahvaltilik-sut-urunleri/peynir';

    console.log(`Fetching ${url}...`);
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                // Add more headers to look legit
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US,en;q=0.9,tr;q=0.8',
                'Cache-Control': 'max-age=0',
                'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        console.log(`Status: ${res.status}`);
        const html = await res.text();

        fs.writeFileSync('a101-dump-new.html', html);
        console.log('Saved to a101-dump-new.html');

        const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
        if (match) {
            console.log('Found NEXT_DATA!');
            const data = JSON.parse(match[1]);
            fs.writeFileSync('a101-next-data.json', JSON.stringify(data, null, 2));
            console.log('Saved NEXT_DATA to a101-next-data.json');
        } else {
            console.log('No NEXT_DATA found.');
        }

    } catch (e) {
        console.error('Error probing A101:', e);
    }
}

probeA101();
