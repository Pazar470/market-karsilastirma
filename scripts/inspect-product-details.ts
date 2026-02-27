
import fetch from 'node-fetch';

async function inspect() {
    // URL for Fruit & Veg
    const url = 'https://rio.a101.com.tr/dbmk89vnr/CALL/Store/getProductsByCategory/VS032?id=C01&channel=SLOT&__culture=tr-TR&__platform=web&data=e30%3D&__isbase64=true';

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://www.a101.com.tr',
                'Referer': 'https://www.a101.com.tr/'
            }
        });
        const data: any = await response.json();

        let products: any[] = [];
        if (data.data) products = data.data;
        else if (data.children) {
            // Debug: check children structure
            // console.log('Children:', data.children.length);
            // It seems products are inside children[i].products
            products = [];
            data.children.forEach((c: any) => {
                if (c.products) products.push(...c.products);
            });
        }

        if (products.length > 0) {
            console.log('--- Inspecting First 3 Products ---');
            products.slice(0, 3).forEach((p, i) => {
                console.log(`\nPRODUCT ${i + 1}: ${p.name}`);
                console.log('Price Field:', p.price);
                console.log('SalePrice Field:', p.salePrice);
                console.log('Attributes Price:', p.attributes?.price);
                console.log('Images Array:', JSON.stringify(p.images, null, 2));
            });
        } else {
            console.log('No products found to inspect.');
        }

    } catch (e) {
        console.error(e);
    }
}

inspect();
