
import fetch from 'node-fetch';

async function fetchSitemap() {
    console.log('Fetching robots.txt...');
    try {
        const r = await fetch('https://www.a101.com.tr/robots.txt', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });
        const txt = await r.text();
        console.log('robots.txt length:', txt.length);

        // Find sitemap line
        const Match = txt.match(/Sitemap: (.*)/);
        let sitemapIdx = 'https://www.a101.com.tr/sitemap.xml';
        if (Match) {
            sitemapIdx = Match[1].trim();
            console.log('Found Sitemap Index:', sitemapIdx);
        } else {
            console.log('No Sitemap declared, trying default:', sitemapIdx);
        }

        // Fetch Sitemap Index
        const siRes = await fetch(sitemapIdx);
        const siXml = await siRes.text();

        // Look for "categories" sitemap
        // <loc>https://www.a101.com.tr/sitemap/categories.xml</loc>
        console.log('Index Content Preview:', siXml.substring(0, 200));

        const catMatch = siXml.match(/<loc>(.*?categories.*?)<\/loc>/);
        if (catMatch) {
            const catXmlUrl = catMatch[1];
            console.log('Found Categories Sitemap:', catXmlUrl);

            // Fetch Categories
            const cRes = await fetch(catXmlUrl);
            const cXml = await cRes.text();

            console.log('Categories XML length:', cXml.length);

            // Regex match urls: ...-c-([A-Za-z0-9]+)
            const regex = /<loc>.*?\/([^\/]+)-c-([A-Za-z0-9]+)<\/loc>/g;
            let m;
            let count = 0;
            const seen = new Set();

            while ((m = regex.exec(cXml)) !== null) {
                const slug = m[1];
                const id = m[2];
                if (!seen.has(id)) {
                    seen.add(id);
                    count++;
                    if (count < 50) { // Log first 50
                        console.log(`[${id}] ${slug}`);
                    }
                }
            }
            console.log(`Total Unique Category IDs found: ${seen.size}`);

        } else {
            console.log('Could not find categories sitemap in index.');
            // Dump basic locs
            const regex = /<loc>(.*?)<\/loc>/g;
            let m;
            let i = 0;
            while ((m = regex.exec(siXml)) !== null && i < 10) {
                console.log('Loc:', m[1]);
                i++;
            }
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

fetchSitemap();
