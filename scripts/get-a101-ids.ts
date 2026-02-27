
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const URLS = [
    'https://www.a101.com.tr/kapida/meyve-sebze',
    'https://www.a101.com.tr/kapida/et-tavuk-sarkuteri',
    'https://www.a101.com.tr/kapida/sut-urunleri-kahvaltilik',
    'https://www.a101.com.tr/kapida/firindan', // -> Fırın & Pastane
    'https://www.a101.com.tr/kapida/temel-gida',
    'https://www.a101.com.tr/kapida/atistirmalik',
    'https://www.a101.com.tr/kapida/su-icecek',
    'https://www.a101.com.tr/kapida/donuk-hazir-yemek-meze', // -> Hazır Yemek & Meze
    'https://www.a101.com.tr/kapida/dondurulmus-urunler',
    'https://www.a101.com.tr/kapida/temizlik-urunleri', // -> Temizlik
    'https://www.a101.com.tr/kapida/kisisel-bakim',
    'https://www.a101.com.tr/kapida/kagit-urunleri',
    'https://www.a101.com.tr/kapida/elektronik',
    'https://www.a101.com.tr/kapida/anne-bebek',
    'https://www.a101.com.tr/kapida/ev-yasam'
];

async function getIds() {
    console.log('Extracting A101 Category IDs...');

    for (const url of URLS) {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.ok) {
                console.error(`Failed: ${url} (${response.status})`);
                continue;
            }

            const html = await response.text();

            // DEBUG: Save HTML to file and exit
            if (url === URLS[0]) {
                const fs = await import('fs');
                fs.writeFileSync('temp_a101.html', html);
                console.log('Saved HTML to temp_a101.html');
            }

            const $ = cheerio.load(html);

            // Method 1: Try JSON-LD (Most reliable)
            const jsonLd = $('#categoryListStructuredJson').html();
            let id = '';
            let name = '';

            if (jsonLd) {
                try {
                    const data = JSON.parse(jsonLd);
                    // data.name might be "C01 A101 Kapıda"
                    // data.breadcrumb.itemListElement array

                    // Strategy A: Last breadcrumb item name
                    if (data.breadcrumb && Array.isArray(data.breadcrumb.itemListElement)) {
                        const items = data.breadcrumb.itemListElement;
                        const lastItem = items[items.length - 1];
                        if (lastItem && lastItem.item && lastItem.item.name) {
                            const candidate = lastItem.item.name;
                            if (candidate.startsWith('C')) {
                                id = candidate;
                            }
                        }
                    }

                    // Strategy B: Parse from Description or Name if A fails
                    if (!id && data.description) {
                        const match = data.description.match(/^(C\d+)/);
                        if (match) id = match[1];
                    }

                } catch (e) {
                    console.error('Error parsing JSON-LD:', e);
                }
            }

            // Method 2: Regex on the whole HTML if JSON-LD fails (Backup)
            if (!id) {
                // Look for "id":"C01" pattern near "category"
                const match = html.match(/"id":"(C\d+)"/);
                if (match) {
                    id = match[1];
                }
            }

            if (id) {
                console.log(`URL: ${url}`);
                console.log(`ID: ${id}`);
                console.log('---');
            } else {
                console.log(`Could not find ID for ${url}`);
            }

            // Standard polite delay
            await new Promise(r => setTimeout(r, 1000));

            // Polite delay
            await new Promise(r => setTimeout(r, 2000));

        } catch (error) {
            console.error(`Error processing ${url}:`, error);
        }
    }
}

getIds();
