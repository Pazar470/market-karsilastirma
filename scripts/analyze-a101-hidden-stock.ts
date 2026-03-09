
import fetch from 'node-fetch';

async function analyze() {
    console.log('--- Analyzing A101 GrupSpot Items (Children) ---');

    const storeId = 'VS032';
    const catId = 'C15';
    const url = `https://rio.a101.com.tr/dbmk89vnr/CALL/Store/getProductsByCategory/${storeId}?id=${catId}&channel=SLOT&__culture=tr-TR&__platform=web&data=e30%3D&__isbase64=true`;

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://www.a101.com.tr',
                'Referer': 'https://www.a101.com.tr/'
            }
        });

        const data: any = await res.json();
        let items: any[] = [];

        if (data?.children) {
            for (const child of data.children) {
                if (child.products) items.push(...child.products);
            }
        }

        console.log(`Fetched ${items.length} child items.`);

        const spot = items.find((i: any) => i.attributes?.nitelikAdi === 'GrupSpot');

        if (spot) {
            console.log('--- GrupSpot Item JSON ---');
            console.log(JSON.stringify(spot, null, 2));
        } else {
            console.log('No GrupSpot items found.');
            // List all nitelikAdi to see what exists
            const distinctNitelik = [...new Set(items.map((i: any) => i.attributes?.nitelikAdi))];
            console.log('Available NitelikAdi:', distinctNitelik);
        }

    } catch (error) {
        console.error("Error fetching:", error);
    }
}

analyze();
