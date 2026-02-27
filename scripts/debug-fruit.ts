
const { scrapeA101 } = require('../lib/scraper/a101');
const { scrapeSok } = require('../lib/scraper/sok');

async function debug() {
    console.log('--- Checking A101 Data ---');
    try {
        const a101Products = await scrapeA101();
        const a101Portakal = a101Products.filter(p => p.name.toLowerCase().includes('portakal'));

        if (a101Portakal.length === 0) {
            console.log('A101: No product found with name "portakal".');
        } else {
            console.log('A101: Found "portakal" products:');
            a101Portakal.forEach(p => {
                console.log(`- Name: ${p.name}, Price: ${p.price}, Image: ${p.imageUrl}`);
            });
        }

        // Check for generic frozen images
        const urlCounts = {};
        a101Products.forEach(p => {
            urlCounts[p.imageUrl] = (urlCounts[p.imageUrl] || 0) + 1;
        });

        console.log('\nA101: Common Image URLs (potential placeholders):');
        Object.entries(urlCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .forEach(([url, count]) => {
                if (count > 5) console.log(`- ${count} times: ${url}`);
            });

    } catch (e) {
        console.error('A101 Error:', e);
    }

    console.log('\n--- Checking Şok Data ---');
    try {
        const sokProducts = await scrapeSok();
        const sokPortakal = sokProducts.filter(p => p.name.toLowerCase().includes('portakal'));

        if (sokPortakal.length === 0) {
            console.log('Şok: No product found with name "portakal".');
        } else {
            console.log('Şok: Found "portakal" products:');
            sokPortakal.forEach(p => {
                console.log(`- Name: ${p.name}, Price: ${p.price}, Image: ${p.imageUrl}, Link: ${p.link}`);
            });
        }
    } catch (e) {
        console.error('Şok Error:', e);
    }
}

debug();
