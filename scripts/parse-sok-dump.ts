
import fs from 'fs';
import path from 'path';

function parseSokDump() {
    const dumpPath = path.join(process.cwd(), 'sok_dump.html');
    const html = fs.readFileSync(dumpPath, 'utf-8');

    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
    if (!match) {
        console.error('No NEXT_DATA found in dump.');
        return;
    }

    try {
        const data = JSON.parse(match[1]);
        // console.log('Top level keys:', Object.keys(data));

        // Navigate potentially deep structure
        // Often in props.pageProps.initialState...

        // Let's look for "categories" keyword in the whole object string to indicate where to look
        // const jsonStr = JSON.stringify(data);
        // const catIndex = jsonStr.indexOf('Kaşar');
        // console.log('Kaşar index:', catIndex);
        // console.log('Snippet:', jsonStr.substring(catIndex - 100, catIndex + 300));

        // Traverse to find categories
        // Süt ve Süt Ürünleri is likely id 460

        // Helper to find key recursively
        function findKey(obj: any, key: string, results: any[] = []) {
            if (!obj || typeof obj !== 'object') return results;

            if (obj[key]) {
                results.push(obj[key]);
            }

            for (const k in obj) {
                findKey(obj[k], key, results);
            }
            return results;
        }

        const categories = findKey(data, 'categories');
        // console.log('Found categories objects:', categories.length);

        // Let's dump the whole structure to a file for easier manual inspection if needed
        fs.writeFileSync('sok-next-data-extracted.json', JSON.stringify(data, null, 2));
        console.log('Extracted full data to sok-next-data-extracted.json');

        // Search specifically for Kaşar in the data
        function searchCategory(nodes: any[]) {
            for (const node of nodes) {
                if (node.name && (node.name.includes('Kaşar') || node.name.includes('Peynir'))) {
                    console.log(`Found: ${node.name} (ID: ${node.id}, Slug: ${node.slug})`);
                }
                if (node.children && node.children.length) {
                    searchCategory(node.children);
                }
                if (node.subCategories && node.subCategories.length) {
                    searchCategory(node.subCategories);
                }
            }
        }

        // Try to find a categories array in the root or common places
        // The dump is likely a category page (Süt ve Süt Ürünleri)
        // So we might find sibling categories or subcategories directly

        // Check "category" or "categories" in pageProps
        // ...

    } catch (e) {
        console.error('Error parsing JSON:', e);
    }
}

parseSokDump();
