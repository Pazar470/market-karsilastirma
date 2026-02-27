
// Node 18+ has global fetch
const cheerio = require('cheerio'); // Need to install or hope it's there. 
// Actually, likely need to use 'cheerio' from node_modules. 
// If require fails, I might need to run this differently or just use regex on text.

async function debugSok() {
    console.log('--- Debugging Şok Portakal ---');
    const url = 'https://www.sokmarket.com.tr/narenciye-c-60';

    try {
        const response = await fetch(url);
        const html = await response.text();

        // Check for NEXT_DATA
        if (html.includes('__NEXT_DATA__')) {
            console.log('Found __NEXT_DATA__ JSON blob!');
            const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/);
            if (match && match[1]) {
                try {
                    const jsonData = JSON.parse(match[1]);
                    console.log('Successfully parsed NEXT_DATA');
                    // Traverse to find products. Usually props.pageProps.initialState.products or similar
                    // Let's log keys to help navigate
                    console.log('Keys in pageProps:', Object.keys(jsonData.props.pageProps || {}));

                    // Try to find products list
                    // Warning structure varies.
                } catch (e) {
                    console.log('Error parsing NEXT_DATA:', e.message);
                }
            }
        }


        // Check for other state variables
        if (html.includes('window.__INITIAL_STATE__')) {
            console.log('Found window.__INITIAL_STATE__');
        }

        // Simple regex check first to see if we have the content
        if (!html.includes('Portakal')) {
            console.log('HTML does not contain "Portakal" (might be CSR or dynamic)');
        } else {
            console.log('HTML contains "Portakal"');
        }

        // Try to parse with cheerio if available, otherwise simple split
        try {
            const $ = cheerio.load(html);

            // Find container with Portakal
            // Look for any element containing 'Portakal'
            $('*').each((i, elem) => {
                const text = $(elem).text().trim();
                // Check direct text or specific class 
                // This is too noisy. Let's look for known structure or specific text match
            });

            // Specific search for product cards
            let found = false;
            // Common selector for product card text (based on scraper)
            // Scraper iterates 'a[href*="-p-"]'

            $('a[href*="-p-"]').each((i, elem) => {
                const rawText = $(elem).text().replace(/\s+/g, ' ').trim();
                if (rawText.toLowerCase().includes('portakal')) {
                    console.log('--- Found Portakal Item ---');
                    console.log('Outer HTML:', $.html(elem));
                    console.log('Full Text:', rawText);
                    console.log('HREF:', $(elem).attr('href'));

                    // Extract prices using the same regex
                    const priceRegex = /(?<!\d)(\d{1,3}(?:[.]\d{3})*(?:,\d{1,2})?)\s*(?:₺|TL)/gi;
                    const matches = rawText.match(priceRegex);
                    console.log('Price Matches:', matches);
                    found = true;
                    return false; // break
                }
            });

            if (!found) console.log('No "Portakal" item found in product cards selector.');

        } catch (e) {
            console.log('Cheerio error (maybe not installed or import issue):', e.message);
            // Fallback: substring around Portakal
            const idx = html.toLowerCase().indexOf('portakal');
            if (idx !== -1) {
                console.log('Context around "Portakal":');
                console.log(html.substring(idx - 100, idx + 300));
            }
        }

    } catch (e) {
        console.error('Error fetching Şok:', e);
    }
}

debugSok();
