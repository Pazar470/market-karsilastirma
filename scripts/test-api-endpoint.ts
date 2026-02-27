
import fetch from 'node-fetch';

async function testApi() {
    const query = 'süt';
    const category = 'Süt & Kahvaltılık';
    const url = `http://localhost:3000/api/products?q=${query}&category=${encodeURIComponent(category)}`;

    console.log(`Testing API: ${url}`);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`Search for "${query}" returned ${Array.isArray(data) ? data.length : 0} results.`);

        if (Array.isArray(data) && data.length > 0) {
            console.log('Sample Result:', JSON.stringify(data[0], null, 2));

            // Check if A101 is presenting
            const a101Items = data.filter((p: any) => p.prices.some((pr: any) => pr.market.name === 'A101'));
            console.log(`Found ${a101Items.length} A101 items.`);

            if (a101Items.length > 0) {
                const p = a101Items[0];
                console.log('A101 Sample Unit Info:', {
                    name: p.name,
                    qty: p.quantityAmount,
                    unit: p.quantityUnit
                });
            }
        } else {
            console.log('No results found. Response:', JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('Test Failed:', error);
    }
}

testApi();
