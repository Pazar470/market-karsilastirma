import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';

async function testApi() {
    // URL extracted from network log
    // C01 = Meyve Sebze? 
    // VS032 = Dispatched Store? we might need a valid store ID.
    const url = 'https://rio.a101.com.tr/dbmk89vnr/CALL/Store/getProductsByCategory/VS032?id=C01&channel=SLOT&__culture=tr-TR&__platform=web&data=e30%3D&__isbase64=true';

    console.log(`Fetching ${url}...`);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                // Add other headers if needed, e.g. Referer
                'Referer': 'https://www.a101.com.tr/',
                'Origin': 'https://www.a101.com.tr'
            }
        });

        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error('Response body:', text);
            return;
        }

        const data: any = await response.json();

        if (data && data.data && Array.isArray(data.data)) {
            console.log(`Found ${data.data.length} items in data.data`);

            if (data.data.length > 0) {
                const samplePath = path.resolve(process.cwd(), 'product-sample.json');
                fs.writeFileSync(samplePath, JSON.stringify(data.data[0], null, 2));
                console.log(`Saved sample item to ${samplePath}`);
            }
        } else {
            // Try to find where the products are
            // The output showed "attributes", maybe it's nested differently?
            console.log('Root keys:', Object.keys(data));
            // recursive search for "name" or "price"
            // or just dump a bit more
            console.log('First 2000 chars:', JSON.stringify(data, null, 2).substring(0, 2000));
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

testApi();
