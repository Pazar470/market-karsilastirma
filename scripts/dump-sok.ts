
import fetch from 'node-fetch';
import * as fs from 'fs';

async function dumpSok() {
    const url = 'https://www.sokmarket.com.tr/sut-ve-sut-urunleri-c-460';
    console.log(`Dumping ${url}...`);
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            }
        });
        const html = await res.text();
        fs.writeFileSync('sok_dump.html', html);
        console.log(`Saved sok_dump.html (${html.length} bytes)`);

        // Search for pricing or product names manually
        const knownProduct = 'Süt';
        const idx = html.indexOf(knownProduct);
        if (idx !== -1) {
            console.log(`Found '${knownProduct}' at index ${idx}`);
            console.log('Context:', html.substring(idx - 100, idx + 200));
        } else {
            console.log(`'${knownProduct}' NOT FOUND in HTML. Confirmed CSR.`);
        }

    } catch (e) {
        console.error(e);
    }
}

dumpSok();
