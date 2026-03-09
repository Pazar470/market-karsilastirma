const fs = require('fs');
const path = require('path');

const htmlPath = path.resolve(__dirname, '../debug-kapida.html');
const html = fs.readFileSync(htmlPath, 'utf-8');

// Look for NEXT_DATA or similar JSON blobs
const nextDataRegex = /<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/;
const match = html.match(nextDataRegex);

if (match && match[1]) {
    console.log('Found __NEXT_DATA__');
    const data = JSON.parse(match[1]);
    const cleanPath = path.resolve(__dirname, '../extracted-next-data.json');
    fs.writeFileSync(cleanPath, JSON.stringify(data, null, 2));
    console.log(`Saved NEXT_DATA to ${cleanPath}`);

    // Inspect data for products
    // Usually props.pageProps.initialState.products or similar
    function findProducts(obj, depth = 0) {
        if (depth > 5) return;
        if (typeof obj !== 'object' || obj === null) return;

        Object.keys(obj).forEach(key => {
            if (key === 'products' || key === 'items' || key === 'results') {
                const val = obj[key];
                if (Array.isArray(val) && val.length > 0) {
                    console.log(`Found candidate array at key "${key}" with length ${val.length}`);
                    console.log('Sample item:', JSON.stringify(val[0], null, 2).substring(0, 200));
                }
            }
            findProducts(obj[key], depth + 1);
        });
    }

    findProducts(data);
} else {
    console.log('__NEXT_DATA__ not found.');
    // Check for other large JSON blobs
    const jsonRegex = /JSON.parse\((.+?)\)/g;
    // This assumes the JSON is passed as a string to JSON.parse
    // It's a bit fragile.

    // Alternatively, look for the personaclick data
    const pcRegex = /mathrics\("offserve","pageview",(.+?)\);/
    const pcMatch = html.match(pcRegex);
    if (pcMatch) {
        console.log('Found mathrics data:', pcMatch[1]);
    }
}
