
import * as fs from 'fs';

const html = fs.readFileSync('sok_dump_detail.html', 'utf-8');

console.log('HTML Length:', html.length);

// Find all "TL" occurrences and print context
let regex = /TL/g;
let match;
let count = 0;

console.log('--- Context around "TL" ---');
while ((match = regex.exec(html)) !== null) {
    const start = Math.max(0, match.index - 50);
    const end = Math.min(html.length, match.index + 50);
    console.log(`Match ${count++}: ...${html.substring(start, end).replace(/\n/g, ' ')}...`);
    if (count > 10) break;
}

// Check for JSON-like structures that might contain price
// Look for "price": or "salePrice": or similar keys if they exist (even if grep failed)
// But since grep failed for "price", let's look for numbers near "TL" manually in the context above.

// Also check for NEXT DATA
const nextDataRegex = /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/;
const nextDataMatch = nextDataRegex.exec(html);

if (nextDataMatch) {
    console.log('--- __NEXT_DATA__ Found ---');
    try {
        const json = JSON.parse(nextDataMatch[1]);
        console.log('Keys in props:', Object.keys(json.props || {}));
        console.log('PageProps:', Object.keys(json.props?.pageProps || {}));
        // Dump the whole JSON to a file for potential inspection
        fs.writeFileSync('sok_next_data.json', JSON.stringify(json, null, 2));
        console.log('Saved __NEXT_DATA__ to sok_next_data.json');
    } catch (e) {
        console.error('Failed to parse __NEXT_DATA__ json', e);
    }
} else {
    console.log('--- __NEXT_DATA__ NOT Found ---');
}
