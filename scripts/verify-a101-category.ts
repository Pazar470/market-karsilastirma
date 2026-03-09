
import fetch from 'node-fetch';

async function verifyA101() {
    // C01: Meyve & Sebze
    // C05: Süt & Kahvaltılık
    const targetCategory = 'C05'; // Milk
    const storeId = 'VS032';

    const payloads = [
        { name: 'Control {}', data: {} },
        { name: '{page: 1}', data: { page: 1 } },
        { name: '{page: 2}', data: { page: 2 } },
        { name: '{pageIndex: 1}', data: { pageIndex: 1 } },
        { name: '{pageSize: 100}', data: { pageSize: 100 } },
        { name: '{size: 100}', data: { size: 100 } }
    ];

    console.log(`--- Testing Data Payload Pagination for ${targetCategory} ---`);

    for (const p of payloads) {
        console.log(`\nTesting: ${p.name}...`);

        const jsonStr = JSON.stringify(p.data);
        const base64 = Buffer.from(jsonStr).toString('base64');
        const encodedData = encodeURIComponent(base64);

        const url = `https://rio.a101.com.tr/dbmk89vnr/CALL/Store/getProductsByCategory/${storeId}?id=${targetCategory}&channel=SLOT&__culture=tr-TR&__platform=web&data=${encodedData}&__isbase64=true`;

        try {
            const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0...' } });
            if (!res.ok) { console.log(`Status: ${res.status}`); continue; }

            const json: any = await res.json();
            let items: any[] = [];
            if (json.data && Array.isArray(json.data)) items.push(...json.data);
            if (json.children) json.children.forEach((c: any) => c.products && items.push(...c.products));

            console.log(`Returned ${items.length} items`);
            if (items.length > 0) {
                console.log(`  First: ${items[0].attributes?.name || items[0].name}`);
                console.log(`  Last:  ${items[items.length - 1].attributes?.name || items[items.length - 1].name}`);
            }

        } catch (e) { console.error('Error:', e); }
    }
}
verifyA101();
