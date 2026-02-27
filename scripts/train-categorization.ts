
import { PrismaClient } from '@prisma/client';
import { scrapeMigrosAPI } from '../lib/scraper/migros-api';
import { scrapeSok } from '../lib/scraper/sok';
import { scrapeA101 } from '../lib/scraper/a101';
import { isProductValid } from '../lib/product-sanity-check';

const prisma = new PrismaClient();

async function trainCategorization() {
    console.log('--- SMART CATEGORY TRAINING ---');
    console.log('User Goal: Analyze 100 random items, correct mapping, repeat.');

    // 1. Clear Database (User Request)
    console.log('Cleaning Database (Product & Price)...');
    await prisma.price.deleteMany({});
    await prisma.product.deleteMany({});
    console.log('Database Cleaned.');

    // 2. Fetch Limited Samples
    // We need to modify scrapers to accept a 'limit' or we just slice the output.
    // Since scraping takes time/resources, ideally we pass a limit to the scraper.
    // For now, I will run them and slice the result array, assuming they don't fetch *too* much initially.
    // Migros: fetches by category. I can ask it to fetch just 1-2 categories.
    // Sok: fetches whole site usually. I might need to intervene.
    // A101: fetches whole site.

    // Better approach: Let's fetch just ONE "Essential" category from each to start.
    // User mentioned: "Temel Gıda", "Bebek Bezi", "Salça".

    // Define Mini-Tasks
    const tasks = [
        { market: 'Migros', category: 'Temel Gıda > Şeker', limit: 20 },
        { market: 'Şok', category: 'Temel Gıda', limit: 20 },
        { market: 'A101', category: 'Temel Gıda', limit: 20 },
    ];

    // Note: Our scrapers currently fetch EVERYTHING or work by hardcoded list.
    // I will modify this script to just CALL the existing scrapers and limit the output processing.
    // Ideally, I should pass a "limit" to the scraper function.

    // For this POC, I will run the scrapers but usage `slice` on the loop if possible or just scrape normal and analyze the first N items.
    // Since SOK and A101 loops are hard to stop from outside without code refactor, I will refactor them lightly to accept an options object if needed.
    // But for now, let's just run them and see what happens. I'll rely on the existing "validity check" I added.

    console.log('\n--- FETCHING SAMPLE DATA ---');

    // MOCKING THE LIMIT: I will rely on the fact that I can't easily limit the *network* calls without changing scraper code deeply (which I might do later).
    // But I can limit the *saving* and *analysis*.

    // Strategy: Verify Granular Categorization
    // I will simulate the scraping of "Salça" from Migros (by calling specific function if possible, or just running it).
    // Migros scraper fetches by category leaf. I can import `getProductsByCategory` if I exported it, but I didn't.
    // I only exported `scrapeMigrosAPI`.

    // Let's run `scrapeMigrosAPI` but I will inject a "stopper" or just inspect the FIRST batch?
    // Actually, `scrapeMigrosAPI` returns ALL products. That's heavy.
    // Refactoring Scrapers to yield batches or accept limits is the PROPER way.

    console.log('Skipping massive scrape. I will perform a "Focused Probe" on essential items.');
    console.log('Target: "Salça", "Peynir", "Zeytin"');

    // I will write specific "Probe" functions here that use the scraper LOGIC but for specific items.
    // This effectively "trains" our understanding.

    await probeMigros('salca');
    // await probeSok('Zeytin'); // Sok validation
    // await probeA101('Peynir'); // A101 validation
    await probeMigros('Peynir');
    await probeMigros('Zeytin');

}

// Helper to find category
function findCategoryByTerm(nodes: any[], term: string): any {
    for (const node of nodes) {
        const nodeName = (node.data.name || '').toLowerCase();
        const nodeSlug = (node.data.prettyName || '').toLowerCase();
        const search = term.toLowerCase();

        // Check Name OR Slug
        if (nodeName.includes(search) || nodeSlug.includes(search)) {
            return node;
        }
        if (node.children) {
            const found = findCategoryByTerm(node.children, term);
            if (found) return found;
        }
    }
    return null;
}

// Global debug helper
function dumpTreeNames(nodes: any[], depth = 0) {
    if (depth > 1) return; // Don't spam
    for (const node of nodes) {
        console.log('  '.repeat(depth) + `- ${node.data.name} (${node.data.prettyName})`);
        if (node.children) dumpTreeNames(node.children, depth + 1);
    }
}

// Helper to dump specific node children
function dumpNodeChildren(node: any) {
    console.log(`\n--- Children of ${node.data.name} ---`);
    if (node.children) {
        for (const child of node.children) {
            console.log(`- ${child.data.name} (${child.data.prettyName})`);
            if (child.children) {
                for (const grand of child.children) {
                    console.log(`  > ${grand.data.name} (${grand.data.prettyName})`);
                }
            }
        }
    } else {
        console.log('(No children)');
    }
}

async function inspectCategory(term: string) {
    console.log(`\n--- INSPECT: "${term}" ---`);
    const treeRes = await fetch('https://www.migros.com.tr/rest/categories', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Content-Type': 'application/json',
            'X-Pweb-Device-Type': 'DESKTOP'
        }
    });
    const treeJson: any = await treeRes.json();
    const node = findCategoryByTerm(treeJson.data, term);
    if (node) dumpNodeChildren(node);
    else console.log('Node not found.');
}

async function probeMigros(term: string) {
    console.log(`\n--- PROBE MIGROS: "${term}" ---`);
    console.log('1. Fetching Category Tree...');
    try {
        const treeRes = await fetch('https://www.migros.com.tr/rest/categories', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Content-Type': 'application/json',
                'X-Pweb-Device-Type': 'DESKTOP'
            }
        });
        const treeJson: any = await treeRes.json();

        console.log(`2. Searching tree for "${term}"...`);
        let catNode = findCategoryByTerm(treeJson.data, term);

        // Fallback: Try specific mapping if "Salça" fails but "Salçalar" exists
        if (!catNode && term === 'Salça') {
            catNode = findCategoryByTerm(treeJson.data, 'Salçalar');
        }

        if (!catNode) {
            console.error(`Could not find category for "${term}". Dumping Top Level:`);
            dumpTreeNames(treeJson.data);
            return;
        }

        const slug = catNode.data.prettyName;
        const catName = catNode.data.name;
        console.log(`Found: ${catName} (Slug: ${slug})`);

        console.log(`3. Fetching Products from ${slug}...`);
        const url = `https://www.migros.com.tr/rest/search/screens/${slug}?reid=123456789`;
        const pRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36)' } });
        const pJson: any = await pRes.json();

        const items = pJson.data?.storeProductInfos || pJson.data?.searchInfo?.storeProductInfos || [];
        console.log(`fetched ${items.length} items.`);

        let accepted = 0;
        let blocked = 0;

        for (const item of items) {
            const name = item.name;
            const price = (item.shownPrice || 0) / 100;
            // Use the full category path if possible, here we just use the found cat name
            const categoryPath = catName;

            const isValid = isProductValid(name, categoryPath, price);

            if (isValid) {
                console.log(`  [OK] ${name}`);
                accepted++;
            } else {
                console.log(`  [BLOCKED] ${name}`);
                blocked++;
            }
        }

        console.log(`Result: ${accepted} Accepted, ${blocked} Blocked.`);

    } catch (e) {
        console.error('Probe Error:', e);
    }
}

async function probeCrossCheck(targetCategoryName: string, sourceCategoryTerm: string) {
    console.log(`\n--- CROSS-CHECK: can "${sourceCategoryTerm}" items pass as "${targetCategoryName}"? ---`);

    // 1. Fetch Source items (e.g. Bakery)
    const treeRes = await fetch('https://www.migros.com.tr/rest/categories', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Content-Type': 'application/json',
            'X-Pweb-Device-Type': 'DESKTOP'
        }
    });
    const treeJson: any = await treeRes.json();
    const sourceNode = findCategoryByTerm(treeJson.data, sourceCategoryTerm);

    if (!sourceNode) { console.log('Source category not found'); return; }

    const slug = sourceNode.data.prettyName;
    const url = `https://www.migros.com.tr/rest/search/screens/${slug}?reid=123`;
    const pRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36)' } });
    const pJson: any = await pRes.json();
    const items = pJson.data?.storeProductInfos || pJson.data?.searchInfo?.storeProductInfos || [];

    let falsePositives = 0;

    items.slice(0, 50).forEach((item: any) => {
        const name = item.name;
        // Check if this bakery item would be valid if we thought it was "Zeytin"
        // Note: isProductValid 3rd arg is price, 2nd is category path.
        // We simulate: "What if we tried to insert this into 'Zeytin' category?"
        // So we pass targetCategoryName as the category path.
        if (isProductValid(name, targetCategoryName, item.shownPrice / 100)) {
            console.warn(`[FAIL] "${name}" would be ACCEPTED as "${targetCategoryName}"!`);
            console.log('DEBUG FAIL:', name, targetCategoryName);
            console.log(`isProductValid result: ${isProductValid(name, targetCategoryName, item.shownPrice / 100)}`);
            // Debugging
            if (name.includes('Zeytinli Açma')) {
                console.log('!!! DEBUG ZEYTINLI ACMA !!!');
                console.log(`Name: '${name}'`);
                console.log(`Target: '${targetCategoryName}'`);
                console.log(`Result: ${isProductValid(name, targetCategoryName, item.shownPrice / 100)}`);
            }
            falsePositives++;
        }
    });

    if (falsePositives === 0) console.log('RESULT: PASS. No false positives found.');
    else console.log(`RESULT: FAIL. ${falsePositives} false positives detected.`);
}

async function runTraining() {
    await probeMigros('bebek-bezi');
    await inspectCategory('Sos');
    await inspectCategory('Konserve');

    // Cross checks
    await probeCrossCheck('Zeytin', 'Pastane'); // Bread/Pastry vs Olive
    await probeCrossCheck('Peynir', 'Pastane'); // Cheese pastry vs Cheese
}

runTraining();
