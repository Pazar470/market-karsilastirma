
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function debug() {
    // A known populated MAIN category: Süt & Süt Ürünleri
    const url = 'https://www.sokmarket.com.tr/sut-ve-sut-urunleri-c-460';
    console.log(`Debugging: ${url}`);

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            }
        });
        const html = await res.text();
        console.log('HTML Length:', html.length);
        console.log('Title:', cheerio.load(html)('title').text());
        console.log('First 500 chars:', html.substring(0, 500));

        const $ = cheerio.load(html);

        // Extract script src
        $('script').each((i, el) => {
            const src = $(el).attr('src');
            if (src && src.includes('_next/static')) {
                console.log('Script:', src);
            }
        });

        // Also look for specific window.__NEXT_DATA__ or window.initialState if they exist in script tags content
        $('script').each((i, el) => {
            const content = $(el).html();
            if (content && (content.includes('__NEXT_DATA__') || content.includes('products'))) {
                console.log('Found potential data in script tag (length: ' + content.length + ')');
            }
        });


        const nextData = $('script#__NEXT_DATA__').html();
        if (nextData) {
            console.log('✅ Found __NEXT_DATA__!');
            const json = JSON.parse(nextData);
            console.log('Keys:', Object.keys(json));

            // Navigate to find products
            // Usually in props.pageProps.initialState... or something similar
            if (json.props && json.props.pageProps) {
                console.log('PageProps Keys:', Object.keys(json.props.pageProps));

                // Try to find product list
                const findProducts = (obj: any, depth = 0): any[] => {
                    if (depth > 5) return [];
                    let found: any[] = [];

                    if (Array.isArray(obj)) {
                        // Check if items look like products (have price, name, id)
                        const sample = obj[0];
                        if (sample && sample.price && sample.name && (sample.id || sample.sku)) {
                            return obj;
                        }
                        for (const item of obj) {
                            if (typeof item === 'object') found = found.concat(findProducts(item, depth + 1));
                        }
                    } else if (typeof obj === 'object' && obj !== null) {
                        for (const key in obj) {
                            if (key === 'products' && Array.isArray(obj[key])) {
                                return obj[key];
                            }
                            found = found.concat(findProducts(obj[key], depth + 1));
                        }
                    }
                    return found;
                };

                // Dumb search
                // Log content of pageProps to analyze structure manually if needed
                // console.log(JSON.stringify(json.props.pageProps, null, 2).substring(0, 1000));

            }
        } else {
            console.log('❌ __NEXT_DATA__ NOT FOUND');
            // Check for other scripts
            $('script').each((i, el) => {
                const id = $(el).attr('id');
                if (id) console.log('Script ID:', id);
            });
        }

    } catch (e) {
        console.error(e);
    }
}

debug();
