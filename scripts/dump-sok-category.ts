
import fetch from 'node-fetch';
import fs from 'fs';

async function dumpCategory() {
    const url = 'https://www.sokmarket.com.tr/meyve-ve-sebze-c-20';
    console.log(`--- Dumping Şok Category HTML: ${url} ---`);

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
        fs.writeFileSync('sok-category-dump.html', html);
        console.log('Successfully wrote sok-category-dump.html');

    } catch (e) {
        console.error('Error:', e);
    }
}

dumpCategory();
