
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function checkSitemap() {
    console.log('Checking A101 Sitemap...');
    // Usually main sitemap is an index of other sitemaps
    const url = 'https://www.a101.com.tr/sitemap.xml';

    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.log('Sitemap fetch failed:', res.status);
            return;
        }
        const xml = await res.text();
        const $ = cheerio.load(xml, { xmlMode: true });

        const locs: string[] = [];
        $('loc').each((i, el) => {
            locs.push($(el).text());
        });

        console.log('Sitemap Index found:', locs.length, 'entries.');
        // Filter for categories
        const catSitemap = locs.find(l => l.includes('category') || l.includes('kategori'));

        if (catSitemap) {
            console.log('Found Category Sitemap:', catSitemap);
            // Fetch that specific sitemap
            const subRes = await fetch(catSitemap);
            const subXml = await subRes.text();
            const sub$ = cheerio.load(subXml, { xmlMode: true });

            const catUrls: string[] = [];
            sub$('loc').each((i, el) => {
                const href = sub$(el).text();
                // Filter for "kaşar"
                if (href.toLowerCase().includes('kasar')) {
                    console.log('✅ FOUND KAŞAR CATEGORY URL:', href);
                }
                catUrls.push(href);
            });
            console.log(`Total Categories in sitemap: ${catUrls.length}`);
            console.log('Sample:', catUrls.slice(0, 5));
        } else {
            console.log('No specific category sitemap found in index. Checking if this IS the category sitemap...');
            // Maybe it's a flat sitemap?
            const kasar = locs.find(l => l.toLowerCase().includes('kasar'));
            if (kasar) console.log('✅ Found Kaşar URL directly:', kasar);
        }

    } catch (e) {
        console.error('Sitemap Error:', e);
    }
}

checkSitemap();
