
import fetch from 'node-fetch'; // Native fetch used

async function checkA101() {
    console.log('--- Checking A101 "Kapıda" Coverage ---');
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    const targetSitemap = 'https://www.a101.com.tr/sitemaps/categories-kapida.xml';

    try {
        const res = await fetch(targetSitemap, { headers });
        if (res.ok) {
            console.log('✅ A101 Kapıda Sitemap Accessed');
            const text = await res.text();

            // Extract locs
            const locs = text.match(/<loc>(.*?)<\/loc>/g)?.map(l => l.replace(/<\/?loc>/g, '')) || [];
            console.log(`Found ${locs.length} category URLs.`);

            // Extract Root Categories from URL structure
            // URL format: https://www.a101.com.tr/kapida/meyve-sebze
            // or https://www.a101.com.tr/kapida/meyve-sebze/sebze

            const roots = new Set();
            locs.forEach(u => {
                // Split by /
                const parts = u.split('/').filter(p => p);
                // [ 'https:', 'www.a101.com.tr', 'kapida', 'meyve-sebze' ]
                const kapidaIndex = parts.indexOf('kapida');

                if (kapidaIndex > -1 && parts[kapidaIndex + 1]) {
                    roots.add(parts[kapidaIndex + 1]);
                }
            });

            console.log('\n--- A101 Active Root Categories (Kapıda) ---');
            const sortedRoots = [...roots].sort();
            sortedRoots.forEach(r => console.log(`- ${r}`));

            // Comparison with our list
            const OUR_LIST = [
                'meyve-sebze', 'et-tavuk-sarkuteri', 'sut-kahvaltilik',
                'firin-pastane', 'temel-gida', 'atistirmalik', 'su-icecek',
                'hazir-yemek-meze', 'dondurulmus-urunler', 'temizlik',
                'kisisel-bakim', 'kagit-urunleri', 'elektronik', 'anne-bebek', 'ev-yasam'
            ];

            console.log('\n--- GAP ANALYSIS ---');
            const potentialMissing = sortedRoots.filter((r: unknown) => {
                const root = String(r);
                // Fuzzy check
                return !OUR_LIST.some(c =>
                    root.includes(c.split('-')[0]) || c.includes(root.split('-')[0])
                );
            });

            if (potentialMissing.length > 0) {
                console.log('Potential Missing Categories:');
                potentialMissing.forEach(m => console.log(`[?] ${m}`));
            } else {
                console.log('✅ All roots seem covered by our scraper list.');
            }

        } else {
            console.log(`❌ Failed to fetch Kapıda sitemap: ${res.status}`);
        }
    } catch (e) {
        console.log(`❌ Error: ${e}`);
    }
}

async function run() {
    await checkA101();
}

run().catch(e => console.error(e));
