
import fetch from 'node-fetch';

async function testPagination() {
    const catId = 'C07'; // Temel Gıda
    const storeId = 'VS032';
    const url = `https://rio.a101.com.tr/dbmk89vnr/CALL/Store/getProductsByCategory/${storeId}?id=${catId}&channel=SLOT&__culture=tr-TR&__platform=web&data=e30%3D&__isbase64=true`;

    console.log(`Fetching C07 (Temel Gıda)...`);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://www.a101.com.tr',
                'Referer': 'https://www.a101.com.tr/'
            }
        });

        const data: any = await response.json();

        let rawItems: any[] = [];
        if (data.data && Array.isArray(data.data)) rawItems.push(...data.data);
        if (data.children) {
            data.children.forEach((c: any) => {
                if (c.products) rawItems.push(...c.products);
            });
        }

        console.log(`Total raw items: ${rawItems.length}`);

        // Simulate Parsing for first 5 items
        const productsToTest = rawItems.slice(0, 5);
        for (const item of productsToTest) {
            const name = item.name || (item.attributes ? item.attributes.name : '') || '';

            let price = 0;
            if (item.price && typeof item.price === 'object') {
                if (item.price.discounted) price = item.price.discounted;
                else if (item.price.normal) price = item.price.normal;
            } else if (typeof item.price === 'number') {
                price = item.price;
            }

            // Division logic
            if (price > 0) price = price / 100;

            // Image logic
            let imageUrl = '';
            const unwantedKeywords = ['yerli', 'dondurulmus', 'glutensiz', 'vegan', 'helal', 'logolar', 'soguk'];
            if (item.images && item.images.length > 0) {
                const validImg = item.images.find((img: any) => {
                    if (!img.url) return false;
                    const lowerUrl = img.url.toLowerCase();
                    return !unwantedKeywords.some(kw => lowerUrl.includes(kw));
                });
                imageUrl = validImg ? validImg.url : item.images[0].url;
            }

            if (imageUrl && imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
                imageUrl = `https://cdn2.a101.com.tr${imageUrl}`;
            }

            console.log('Parsed Item:');
            console.log(`  Name: ${name}`);
            console.log(`  Price: ${price} TL`);
            console.log(`  KV Price: ${item.price?.discounted} (Raw)`);
            console.log(`  Image: ${imageUrl}`);
            console.log('---');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

testPagination();
