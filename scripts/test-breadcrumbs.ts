
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function testA101() {
    console.log('\n--- A101 Breadcrumb Check ---');
    // Category: Süt & Kahvaltılık (C05)
    const storeId = 'VS032';
    const catId = 'C05';
    const url = `https://rio.a101.com.tr/dbmk89vnr/CALL/Store/getProductsByCategory/${storeId}?id=${catId}&channel=SLOT&__culture=tr-TR&__platform=web&data=e30%3D&__isbase64=true`;

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://www.a101.com.tr',
                // 'Referer': 'https://www.a101.com.tr/'
            }
        });
        const json: any = await res.json();

        let sampleProduct;
        if (json.data && json.data.length > 0) sampleProduct = json.data[0];

        // Fallback search in children
        if (!sampleProduct && json.children) {
            for (const child of json.children) {
                if (child.products && child.products.length > 0) {
                    sampleProduct = child.products[0];
                    break;
                }
            }
        }

        if (sampleProduct) {
            console.log('Sample Product Name:', sampleProduct.name);
            // Log entire attributes to see if categoryPath exists
            // console.log('Attributes:', JSON.stringify(sampleProduct.attributes, null, 2)); 

            // Check specific fields
            const catPath = sampleProduct.attributes?.categoryPath || sampleProduct.categoryPath;
            const breadcrumbs = sampleProduct.breadcrumbs;
            const categoryName = sampleProduct.category || sampleProduct.attributes?.category;

            console.log('Category Field:', categoryName);
            console.log('Category Path:', catPath);
            console.log('Breadcrumbs:', breadcrumbs);

            if (sampleProduct.attributes) {
                console.log('Attributes Keys:', Object.keys(sampleProduct.attributes));
            }
        } else {
            console.log('No products found to inspect.');
        }

    } catch (e) {
        console.error('A101 Error:', e);
    }
}

async function testSok() {
    console.log('\n--- Şok Breadcrumb Check ---');
    // Use a PRODUCT page, not category page, to get full path
    const url = 'https://www.sokmarket.com.tr/mis-tam-yagli-taze-kasar-peyniri-500-gr-p-13799';

    try {
        const res = await fetch(url);
        const html = await res.text();
        const $ = cheerio.load(html);

        const breadcrumbItems: string[] = [];

        // Look for typical breadcrumb list items
        $('ul li a').each((i, el) => {
            const text = $(el).text().trim();
            const href = $(el).attr('href');
            if (href && href.includes('-c-')) { // heuristic for category links
                breadcrumbItems.push(text);
            }
        });

        // Also check for specific classes often used in breadcrumbs
        if (breadcrumbItems.length === 0) {
            $('[class*="breadcrumb"] a, [class*="Breadcrumb"] a').each((i, el) => {
                breadcrumbItems.push($(el).text().trim());
            });
        }

        console.log('Product URL:', url);
        console.log('Extracted Breadcrumbs:', breadcrumbItems);

    } catch (e) {
        console.error('Şok Error:', e);
    }
}

async function testMigros() {
    console.log('\n--- Migros Breadcrumb Check ---');
    // Query "Kaşar"
    const url = 'https://www.migros.com.tr/rest/search/screens/products?q=ka%C5%9Far&reid=1234567890123456789&page=1';

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Content-Type': 'application/json',
                'X-Pweb-Device-Type': 'DESKTOP'
            }
        });
        const json: any = await res.json();

        if (json.data?.searchInfo?.storeProductInfos?.length > 0) {
            const p = json.data.searchInfo.storeProductInfos[0];
            console.log('Sample Product:', p.name);
            // Check if there is a 'category' object and if it has parent info or ID structure
            // Sometimes IDs are hierarchical e.g. 100 -> 100200 -> 100200300
            console.log('Category Object:', JSON.stringify(p.category, null, 2));
            console.log('Category ID:', p.category?.id);
        } else {
            console.log('No Migros products found.');
        }

    } catch (e) {
        console.error('Migros Error:', e);
    }
}

async function run() {
    await testA101();
    await testSok();
    await testMigros();
}

run();
