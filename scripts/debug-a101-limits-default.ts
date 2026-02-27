
import fetch from 'node-fetch';

const STORE_ID = 'VS032';
const CATEGORY_ID = 'C07'; // Temel Gida

async function run() {
    // Default payload: e30= ({})
    const URL = `https://rio.a101.com.tr/dbmk89vnr/CALL/Store/getProductsByCategory/${STORE_ID}?id=${CATEGORY_ID}&channel=SLOT&__culture=tr-TR&__platform=web&data=e30%3D&__isbase64=true`;

    console.log(`Fetching A101 Category ${CATEGORY_ID} (Default)...`);
    try {
        const response = await fetch(URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://www.a101.com.tr',
                'Referer': 'https://www.a101.com.tr/'
            }
        });

        const data: any = await response.json();

        let count = 0;
        if (data.data) count += data.data.length;
        if (data.children) {
            data.children.forEach((c: any) => {
                if (c.products) count += c.products.length;
            });
        }

        console.log(`Total Items Return: ${count}`);

    } catch (e) {
        console.error(e);
    }
}

run();
