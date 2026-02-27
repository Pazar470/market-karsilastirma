
import { scrapeMigrosAPI } from '../lib/scraper/migros-api';
import { scrapeA101 } from '../lib/scraper/a101';

async function debugPaths() {
    console.log('--- DEBUGGING MIGROS PATHS ---');
    // Hack: Modify Migros scraper locally or just run it and see logs? 
    // Actually, I'll just copy-paste a snippet of the logic here to test specific URLs/End points because running the full scraper is heavy.

    // MIGROS TEST
    const migrosLeaf = 'Kaşar Peynirleri';
    console.log(`Fetching Migros Leaf: ${migrosLeaf}`);
    // This is a simplified fetch from migros-api.ts
    const mUrl = `https://www.migros.com.tr/rest/search/screens/products?q=${encodeURIComponent(migrosLeaf)}&page=1&reid=123`;
    try {
        const mRes = await fetch(mUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Content-Type': 'application/json',
                'X-Pweb-Device-Type': 'DESKTOP'
            }
        });
        const mJson: any = await mRes.json();
        const mItems = mJson.data?.searchInfo?.storeProductInfos || [];
        if (mItems.length > 0) {
            console.log('Migros Sample Category Data:', JSON.stringify(mItems[0].category, null, 2));
            // Check if parent info exists in the item
        }
    } catch (e) { console.error(e); }

    console.log('\n--- DEBUGGING A101 PATHS ---');
    // A101 TEST - C05 (Süt & Kahvaltılık)
    const aUrl = `https://rio.a101.com.tr/dbmk89vnr/CALL/Store/getProductsByCategory/VS032?id=C05&channel=SLOT&__culture=tr-TR&__platform=web&data=e30%3D&__isbase64=true`;
    try {
        const aRes = await fetch(aUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://www.a101.com.tr',
                'Referer': 'https://www.a101.com.tr/'
            }
        });
        const aJson: any = await aRes.json();
        const aItems = aJson.data || [];
        if (aItems.length > 0) {
            const item = aItems[0];
            console.log('A101 Sample Categories Array:', JSON.stringify(item.categories, null, 2));
            console.log('A101 Sample Attributes Category:', item.attributes?.category);
        }
    } catch (e) { console.error(e); }
}

debugPaths();
