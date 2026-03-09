
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function fetchSokTree() {
    console.log('\n--- Şok Category Tree ---');
    try {
        const res = await fetch('https://www.sokmarket.com.tr/');
        const html = await res.text();
        const $ = cheerio.load(html);

        const topCategories: any[] = [];

        // 1. Get Top Level
        $('a[href*="-c-"]').each((i, el) => {
            const href = $(el).attr('href');
            const name = $(el).text().trim();
            if (href && name) {
                const fullUrl = `https://www.sokmarket.com.tr${href}`;
                // Basic duplication validation
                if (!topCategories.find(c => c.url === fullUrl)) {
                    topCategories.push({ name, url: fullUrl });
                }
            }
        });

        console.log(`Found ${topCategories.length} top-level links. Checking subcategories for first 3...`);

        // 2. Visit Top Level to get Subcategories (Limit to 3 for test speed)
        for (const cat of topCategories.slice(0, 3)) {
            try {
                // console.log(`Visiting ${cat.name}...`);
                const subRes = await fetch(cat.url);
                const subHtml = await subRes.text();
                const sub$ = cheerio.load(subHtml);

                // Şok subcategories usually are links in a specific sidebar or top bar
                // Let's filter links that contain the parent's slug or just other -c- links
                const subCats: string[] = [];
                sub$('a[href*="-c-"]').each((i, el) => {
                    const subName = sub$(el).text().trim();
                    if (subName && subName !== cat.name && !subCats.includes(subName)) {
                        subCats.push(subName);
                    }
                });

                console.log(` > ${cat.name}: Found ${subCats.length} subs. Examples: ${subCats.slice(0, 3).join(', ')}`);

                if (subCats.some(s => s.toLowerCase().includes('kaşar'))) {
                    console.log('   ✅ FOUND KAŞAR HERE!');
                }
            } catch (err) {
                console.error(`Failed to visit ${cat.name}`);
            }
            // Polite delay
            await new Promise(r => setTimeout(r, 500));
        }

    } catch (e) {
        console.error('Şok Tree Error:', e);
    }
}

async function fetchA101Tree() {
    console.log('\n--- A101 Category Tree ---');
    // Attempt 3: The public website API often used for the main menu
    // This is the one used by the browser. 
    // We need to fetch the main HTML and look for __NEXT_DATA__ or similar if it is a Next.js app (it is).
    try {
        const res = await fetch('https://www.a101.com.tr/');
        const html = await res.text();
        const $ = cheerio.load(html);

        let found = false;

        // A101 Mega Menu often uses data-testid or specific semantic tags
        // Let's try to find ANY link that looks like a sub-category
        // Searching for "Peynir" or "Süt" text in links

        const categories: string[] = [];

        $('a').each((i, el) => {
            const txt = $(el).text().trim();
            const href = $(el).attr('href');

            if (href && (href.includes('/market/') || href.includes('/kapida/')) && txt.length > 3) {
                // Check if it's a category-like link
                // Usually /market/kahvaltilik-c-123
                if (href.match(/-c-\d+$/)) {
                    const entry = `${txt} (${href})`;
                    if (!categories.includes(entry)) categories.push(entry);

                    if (txt.toLowerCase().includes('kaşar')) {
                        console.log(`✅ FOUND KAŞAR: ${entry}`);
                        found = true;
                    }
                }
            }
        });

        console.log(`Found ${categories.length} category-like links.`);
        if (categories.length > 0) {
            console.log('Sample:', categories.slice(0, 5));
        }

        if (!found) {
            console.log('❌ Kaşar specific link not found in main page HTML.');
        }

    } catch (e) {
        console.error('A101 Tree Error:', e);
    }
}

async function run() {
    await fetchSokTree();
    await fetchA101Tree();
}

run();
