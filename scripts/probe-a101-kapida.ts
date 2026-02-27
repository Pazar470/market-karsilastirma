
import fetch from 'node-fetch';
import fs from 'fs';

async function probeA101Kapida() {
    const url = 'https://www.a101.com.tr/kapida/sut-urunleri-kahvaltilik/kasar-peyniri';
    console.log(`Fetching ${url}...`);

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            }
        });

        console.log('Status:', res.status);
        const html = await res.text();
        fs.writeFileSync('a101-kapida-dump.html', html);

        if (html.includes('NEXT_DATA')) {
            console.log('FOUND NEXT_DATA');
            const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
            if (match) {
                fs.writeFileSync('a101-kapida-next-data.json', match[1]);
                console.log('Extracted NEXT_DATA to a101-kapida-next-data.json');
            }
        } else {
            console.log('No NEXT_DATA found.');
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

probeA101Kapida();
