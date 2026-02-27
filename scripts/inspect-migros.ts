
import fetch from 'node-fetch';
import * as fs from 'fs';

async function inspectMigros() {
    // Migros Sanal Market Base URL often uses API or Next.js
    // Let's try a category URL first.
    // Example: Meyve & Sebze (Check live site for actual slug)
    // Common Migros URL pattern: https://www.migros.com.tr/meyve-sebze-c-2

    const url = 'https://www.migros.com.tr/meyve-sebze-c-2';
    console.log(`Fetching Migros Category URL: ${url}...`);

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!res.ok) {
            console.error(`Failed: ${res.status}`);
            return;
        }

        const html = await res.text();
        console.log(`Total length: ${html.length}`);

        fs.writeFileSync('migros_dump.html', html);
        console.log('Dumped HTML to migros_dump.html');

        // Analysis
        // 1. Check for Next.js Data
        const nextDataRegex = /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/;
        const nextDataMatch = nextDataRegex.exec(html);

        if (nextDataMatch) {
            console.log('✅ __NEXT_DATA__ FOUND');
            try {
                const json = JSON.parse(nextDataMatch[1]);
                fs.writeFileSync('migros_next_data.json', JSON.stringify(json, null, 2));
                console.log('Saved __NEXT_DATA__ to migros_next_data.json');
            } catch (e) {
                console.error('Failed to parse JSON');
            }
        } else {
            console.log('❌ __NEXT_DATA__ NOT FOUND (Might be plain HTML or other framework)');
        }

        // 2. Check for Prices in HTML text
        // Pattern 123,90 TL
        const priceRegex = /(\d{1,3}(?:[.]\d{3})*(?:,\d{1,2})?)\s*(?:TL|₺)/gi;
        let pFound = 0;
        let m;
        while ((m = priceRegex.exec(html)) !== null) {
            console.log(`Price Pattern: ${m[0]}`);
            pFound++;
            if (pFound > 5) break;
        }

    } catch (e) {
        console.error(e);
    }
}

inspectMigros();
