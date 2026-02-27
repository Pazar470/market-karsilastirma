
// Node 18+ has global fetch


async function debugA101() {
    console.log('--- Debugging A101 Fruit ---');
    // C08 Su & İçecek
    const catId = 'C08';
    const storeId = 'VS032';
    const url = `https://rio.a101.com.tr/dbmk89vnr/CALL/Store/getProductsByCategory/${storeId}?id=${catId}&channel=SLOT&__culture=tr-TR&__platform=web&data=e30%3D&__isbase64=true`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Origin': 'https://www.a101.com.tr',
                'Referer': 'https://www.a101.com.tr/'
            }
        });
        const data = await response.json();

        // Flatten products
        let products = [];
        if (data.data) products.push(...data.data);
        if (data.children) {
            data.children.forEach(c => {
                if (c.products) products.push(...c.products);
            });
        }

        console.log(`Found ${products.length} items in category ${catId}`);


        // C05 is Süt & Kahvaltılık (Check for Cheese)
        // const catId = 'C05'; 
        // Or C08 for Icecek
        // const catId = 'C08'; 

        // Search for specific out of stock items
        const targetNames = ['cola turka', 'bahçıvan'];

        const targets = products.filter(p => {
            const name = p.name || (p.attributes ? p.attributes.name : '') || '';
            return targetNames.some(t => name.toLowerCase().includes(t));
        });

        console.log(`Found ${targets.length} target items.`);

        targets.forEach(p => {
            const name = p.name || (p.attributes ? p.attributes.name : '') || 'Unknown';
            console.log('--- Item ---');
            console.log('Name:', name);

            // Log top level keys
            // console.log('Keys:', Object.keys(p));

            // check attributes
            if (p.attributes) {
                console.log('Attributes:', JSON.stringify(p.attributes, null, 2));
            }

            // Check for specific fields
            ['stock', 'inventory', 'quantity', 'is_sellable', 'status', 'active'].forEach(key => {
                if (p[key] !== undefined) console.log(`${key}:`, p[key]);
                if (p.attributes && p.attributes[key] !== undefined) console.log(`attr.${key}:`, p.attributes[key]);
            });

            // Log raw object (first one only to save space)
            if (targets.indexOf(p) === 0) {
                console.log('--- RAW OBJECT (Partial) ---');
                console.log(JSON.stringify(p, null, 2).slice(0, 2000));
            }
        });




        // Check image frequency
        const urlCounts = {};
        products.forEach(p => {
            if (p.images && p.images.length) {
                p.images.forEach(img => {
                    urlCounts[img.url] = (urlCounts[img.url] || 0) + 1;
                });
            }
        });

        console.log('Top 5 Frequent Images:');
        Object.entries(urlCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .forEach(([url, count]) => console.log(`${count}x ${url}`));


    } catch (e) {
        console.error('Error:', e);
    }
}

debugA101();
