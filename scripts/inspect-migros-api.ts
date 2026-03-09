
import fetch from 'node-fetch';

async function verifyEndpoint() {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'X-Pweb-Device-Type': 'DESKTOP'
    };

    // Endpoint from Puppeteer
    const reid = '1234567890123456789'; // Random string
    const url = `https://www.migros.com.tr/rest/search/screens/products?q=sut&reid=${reid}`;

    console.log(`Fetching ${url}...`);
    try {
        const res = await fetch(url, { headers });
        if (res.ok) {
            const data: any = await res.json();
            console.log('SUCCESS!');

            // Check deep structure
            if (data.data?.searchInfo?.storeProductInfos) {
                const products = data.data.searchInfo.storeProductInfos;
                console.log(`Found ${products.length} products.`);
                if (products.length > 0) {
                    console.log('First Product:', products[0].name);
                    console.log('Price:', products[0].regularPrice);
                }
            } else {
                console.log('Structure unexpected:', JSON.stringify(data).substring(0, 200));
            }
        } else {
            console.log('Failed:', res.status, await res.text());
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

verifyEndpoint();
