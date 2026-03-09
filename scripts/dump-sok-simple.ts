
import fetch from 'node-fetch';
import * as fs from 'fs';

async function dumpSokProduct() {
    console.log('--- Dumping Şok Product HTML ---');
    // Direct URL to the known keychain product
    const url = 'https://www.sokmarket.com.tr/kalpli-anahtarlik-cukurova-kadin-koop-p-566158';

    console.log(`Fetching: ${url}`);

    try {
        const res = await fetch(url);
        const html = await res.text();

        fs.writeFileSync('sok-product-dump.html', html);
        console.log('Successfully wrote sok-product-dump.html');

    } catch (e) {
        console.error(e);
    }
}

dumpSokProduct().catch(console.error);
