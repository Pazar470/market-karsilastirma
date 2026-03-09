import * as fs from 'fs';

const files = [
    { market: 'Migros', file: 'migros_categories.json' },
    { market: 'A101', file: 'a101_categories.json' },
    { market: 'Sok', file: 'sok_categories.json' },
];

const allLeaves: { market: string; id: string; name: string; path: string }[] = [];

for (const entry of files) {
    const raw = JSON.parse(fs.readFileSync(entry.file, 'utf-8'));
    const cats = raw.categories || raw;
    for (const cat of cats) {
        allLeaves.push({ market: entry.market, id: cat.id || cat.prettyName || '', name: cat.name, path: cat.path || cat.name });
    }
}

// Group by leaf name
const grouped: Record<string, { markets: string[]; paths: string[] }> = {};
for (const leaf of allLeaves) {
    const key = leaf.name.trim();
    if (!grouped[key]) grouped[key] = { markets: [], paths: [] };
    if (!grouped[key].markets.includes(leaf.market)) grouped[key].markets.push(leaf.market);
    if (!grouped[key].paths.includes(leaf.path)) grouped[key].paths.push(leaf.path);
}

// Print sorted
const sorted = Object.entries(grouped).sort((a, b) => b[1].markets.length - a[1].markets.length || a[0].localeCompare(b[0], 'tr'));

console.log(`\nToplam unique yaprak kategori: ${sorted.length}\n`);
console.log('='.repeat(90));
console.log(`${'Yaprak Kategori'.padEnd(35)} | ${'Marketler'.padEnd(20)} | Path Örneği`);
console.log('='.repeat(90));
for (const [name, data] of sorted) {
    const markets = data.markets.join(', ').padEnd(20);
    const pathExample = data.paths[0].substring(0, 40);
    console.log(`${name.padEnd(35)} | ${markets} | ${pathExample}`);
}
