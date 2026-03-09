
import fetch from 'node-fetch';

async function verifySorting() {
    try {
        console.log('Testing Sort By Unit Price...');
        // Search for something common, e.g. "Süt" or "Peynir" or "Yağ"
        // And request sorting
        const response = await fetch('http://localhost:3000/api/products?q=Süt&sortBy=unitPriceAsc');

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const products = await response.json();
        console.log(`Fetched ${products.length} products.`);

        if (products.length === 0) {
            console.log('No products found to sort.');
            return;
        }

        console.log('Top 5 Cheapest via Unit Price:');
        let previousPrice = 0;
        let isSorted = true;

        for (let i = 0; i < Math.min(products.length, 5); i++) {
            const p = products[i];
            const price = parseFloat(p.prices[0]?.amount || '0');
            const unitPrice = (p.quantityAmount && p.quantityAmount > 0)
                ? price / p.quantityAmount
                : price;

            console.log(`${i + 1}. ${p.name} - ${price} TL / ${p.quantityAmount} ${p.quantityUnit} = ${unitPrice.toFixed(2)} TL/birim`);

            if (unitPrice < previousPrice && i > 0) {
                isSorted = false;
                console.error(`❌ Sorting Error: Item ${i + 1} is cheaper than previous!`);
            }
            previousPrice = unitPrice;
        }

        if (isSorted) {
            console.log('✅ Sorting verified!');
        } else {
            console.log('❌ Sorting failed.');
        }

    } catch (error) {
        console.error('Verification failed:', error);
    }
}

verifySorting();
