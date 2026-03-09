
import fetch from 'node-fetch';
import fs from 'fs';

async function probeA101Kasar() {
    const url = 'https://www.a101.com.tr/market/kahvaltilik-sut-urunleri/kasar-peyniri';
    console.log(`Fetching ${url}...`);

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
            }
        });

        console.log('Status:', res.status);
        const html = await res.text();
        fs.writeFileSync('a101-kasar-dump.html', html);
        console.log('Saved to a101-kasar-dump.html');

        if (html.includes('Muratbey') || html.includes('Torku') || html.includes('Kaşar')) {
            console.log('FOUND Keywords in HTML!');
        } else {
            console.log('Keywords NOT found in HTML.');
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

probeA101Kasar();
