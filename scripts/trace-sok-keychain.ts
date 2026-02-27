
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function traceSokKeychain() {
    console.log('--- Tracing Şok "Anahtarlık" Category ---');
    // Search for "anahtarlık" to find its product page and see breadcrumbs
    const url = 'https://www.sokmarket.com.tr/arama?q=anahtarl%C4%B1k';

    console.log(`Searching: ${url}`);

    try {
        const res = await fetch(url);
        const html = await res.text();
        const $ = cheerio.load(html);

        let found = false;

        // Find product links
        const productLinks: string[] = [];
        $('a[href*="-p-"]').each((i, el) => {
            productLinks.push($(el).attr('href') || '');
        });

        console.log(`Found ${productLinks.length} search results.`);

        if (productLinks.length > 0) {
            // Visit first product to check breadcrumbs
            const productUrl = `https://www.sokmarket.com.tr${productLinks[0]}`;
            console.log(`Visiting Product: ${productUrl}`);

            const pRes = await fetch(productUrl);
            const pHtml = await pRes.text();
            const $p = cheerio.load(pHtml);

            // DUMP HTML to verify structure
            const fs = require('fs');
            fs.writeFileSync('sok-product-dump.html', pHtml);
            console.log('Dumped HTML to sok-product-dump.html');

            // Try to extract JSON-LD or Next Data
            const jsonLd = $('script[type="application/ld+json"]').html();
            if (jsonLd) {
                try {
                    const data = JSON.parse(jsonLd);
                    console.log('JSON-LD Category:', data.category || 'Not found');
                } catch (e) {
                    console.log('JSON-LD Parse Error');
                }
            }

            // Also check meta tags
            /*
            <meta property="product:category" content="Meyve & Sebze" />
            */
            const metaCat = $('meta[property="product:category"]').attr('content');
            if (metaCat) {
                console.log('Meta Tag Category:', metaCat);
                if (metaCat.includes('Meyve') || metaCat.includes('Sebze')) {
                    console.log('!!! CONFIRMED VIA META: Product IS in Fruit & Veg !!!');
                }
            } else {
                console.log('Meta category not found.');
            }

            // Check NEXT_DATA for raw props
            const nextData = $('script#__NEXT_DATA__').html();
            if (nextData) {
                try {
                    const nd = JSON.parse(nextData);
                    // Usually under props.pageProps.product...
                    const prod = nd.props?.pageProps?.product;
                    if (prod) {
                        console.log('NEXT_DATA Category Path:', prod.categoryPath); // Adjust based on actual structure
                        console.log('NEXT_DATA Category Name:', prod.categoryName);
                    }
                } catch (e) { }
            }

            // Extract breadcrumbs
            // Breadcrumbs usually in a nav or ul structure
            const crumbs: string[] = [];
            $('.breadcrumb li, .breadcrumb-item, nav[aria-label="breadcrumb"] a').each((i, el) => {
                const txt = $(el).text().trim();
                if (txt) crumbs.push(txt);
            });

            // If standard selectors fail, try to dump common text
            console.log('Breadcrumbs found:', crumbs.join(' > '));

            if (crumbs.some(c => c.includes('Meyve') || c.includes('Sebze'))) {
                console.log('!!! CONFIRMED: Product IS in Fruit & Veg !!!');
            } else {
                console.log('Product seems to be in unrelated category via Breadcrumbs.');
            }
        }

    } catch (e) {
        console.error(e);
    }
}

traceSokKeychain().catch(console.error);
