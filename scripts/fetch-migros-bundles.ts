
import fetch from 'node-fetch';
import * as fs from 'fs';

async function fetchBundles() {
    const version = '1.0.0-f-atl-3520-f42b21e';
    const baseUrl = 'https://www.migros.com.tr';

    // Angular usually has these
    const candidates = [
        `main.${version}.js`,
        `main-es2015.${version}.js`,
        `main-es5.${version}.js`,
        `runtime.${version}.js`,
        `polyfills.${version}.js`,
        `styles.${version}.css`
    ];

    for (const file of candidates) {
        const url = `${baseUrl}/${file}`;
        console.log(`Trying ${url}...`);
        try {
            const res = await fetch(url);
            if (res.ok) {
                console.log(`FOUND: ${file}`);
                const text = await res.text();
                fs.writeFileSync(file, text);
                console.log(`Saved ${file} (${text.length} bytes)`);

                // Scan for 'product' or 'search' in the content
                if (text.includes('product')) console.log(`- Contains "product"`);
                if (text.includes('/rest/')) console.log(`- Contains "/rest/"`);
            } else {
                console.log(`Failed: ${res.status}`);
            }
        } catch (e) {
            console.log(`Error fetching ${url}:`, e.message);
        }
    }
}

fetchBundles();
