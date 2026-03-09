
import * as cheerio from 'cheerio';

async function fetchA101Categories() {
    console.log('Fetching A101 Homepage for Categories...');
    try {
        const res = await fetch('https://www.a101.com.tr/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const html = await res.text();
        const $ = cheerio.load(html);

        const categories: { name: string, url: string }[] = [];

        $('a[href*="/market/"]').each((_, el) => {
            const href = $(el).attr('href') || '';
            const text = $(el).text().trim();

            // A101 specific: Categories often have 'group' or just be clean paths
            // Avoid products which usually have a specific pattern or are just too deep
            // Product links often end with -p-[code]
            // Category links often end with -c-[code]

            if (href.includes('-p-')) return; // Skip products
            // if (!href.includes('-c-')) return; // Strict category check? Some might not have it

            if (text && text.length > 2 && !text.includes('Kampanya') && !text.includes('Sepet') && !text.includes('Giriş')) {
                categories.push({ name: text, url: href });
            }
        });

        // De-duplicate by URL
        const unique = Array.from(new Map(categories.map(item => [item.url, item])).values());

        console.log(`Found ${unique.length} potential categories/links on A101.`);
        console.log('Sample Categories:', unique.slice(0, 5));
        console.log('All Categories Names:', unique.map(c => c.name));
        return unique.map(c => c.name);
    } catch (e) {
        console.error('Failed to fetch A101:', e);
        return [];
    }
}

async function fetchSokCategories() {
    console.log('Fetching Şok Homepage for Categories...');
    try {
        const res = await fetch('https://www.sokmarket.com.tr/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const html = await res.text();
        const $ = cheerio.load(html);

        const categories: string[] = [];
        // Sok categories often in sidebar or header
        $('a[href*="-c-"]').each((_, el) => {
            const text = $(el).text().trim();
            if (text && text.length > 2) {
                categories.push(text);
            }
        });

        const unique = [...new Set(categories)];
        console.log(`Found ${unique.length} potential categories/links on Şok.`);
        // console.log(unique.slice(0, 10));
        return unique;
    } catch (e) {
        console.error('Failed to fetch Şok:', e);
        return [];
    }
}

async function run() {
    const a101 = await fetchA101Categories();
    const sok = await fetchSokCategories();

    console.log('\n--- COVERAGE SUMMARY ---');
    console.log(`A101 Live Links: ${a101.length}`);
    console.log(`Şok Live Links: ${sok.length}`);
}

run();
