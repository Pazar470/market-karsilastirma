
import fetch from 'node-fetch';
import * as fs from 'fs';

async function fetchCdnBundles() {
    // Found via grep or hypothesis
    const cdnBase = 'https://assets.migrosone.com/sanalmarket-pweb-app';
    // Need to find the exact filenames from the grep result first
    // But I will try the version hash pattern again on the CDN
    const version = '1.0.0-f-atl-3520-f42b21e';
    const candidates = [
        `main.${version}.js`,
        `main-es2015.${version}.js`
    ];

    for (const file of candidates) {
        const url = `${cdnBase}/${file}`;
        console.log(`Trying CDN: ${url}...`);
        try {
            const res = await fetch(url);
            if (res.ok) {
                console.log(`FOUND on CDN: ${file}`);
                const text = await res.text();
                fs.writeFileSync('cdn_' + file, text);
                console.log(`Saved ${file} (${text.length} bytes)`);

                // Quick Scan
                if (text.includes('/rest/')) console.log(`- Contains "/rest/"`);
                if (text.includes('product-search')) console.log(`- Contains "product-search"`);
            } else {
                console.log(`Failed CDN: ${res.status}`);
            }
        } catch (e) {
            console.log(`Error: ${e.message}`);
        }
    }
}

fetchCdnBundles();
