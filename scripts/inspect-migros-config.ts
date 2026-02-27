
import fetch from 'node-fetch';
import * as fs from 'fs';

async function fetchConfigs() {
    const files = [
        'https://www.migros.com.tr/env.js?1.0.0-f-atl-3520-f42b21e',
        'https://www.migros.com.tr/globals.js?1.0.0-f-atl-3520-f42b21e'
    ];

    for (const url of files) {
        console.log(`Fetching ${url}...`);
        try {
            const res = await fetch(url);
            if (res.ok) {
                const text = await res.text();
                console.log(`--- ${url} ---`);
                console.log(text.substring(0, 500));
                fs.writeFileSync(url.split('/').pop().split('?')[0], text);
            } else {
                console.log(`Failed ${url}: ${res.status}`);
            }
        } catch (e) {
            console.error(e);
        }
    }
}

fetchConfigs();
