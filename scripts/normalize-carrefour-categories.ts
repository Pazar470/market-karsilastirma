
import * as fs from 'fs';

// Read raw file
const raw = fs.readFileSync('carrefour_clean.json', 'utf16le');
// Convert buffer to string, already string
let content = raw.toString();
if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
}
// Also remove any leading garbage until '['
const start = content.indexOf('[');
if (start > -1) {
    content = content.substring(start);
}
// Remove trailing garbage
const end = content.lastIndexOf(']');
if (end > -1) {
    content = content.substring(0, end + 1);
}

let parsed: any[] = [];
try {
    parsed = JSON.parse(content);
} catch (e: any) {
    console.error('JSON Parse Error, falling back to regex', e.message);
    // Fallback regex (matches name, then url, with comma in between)
    // Multiline compatible
    const regex = /"name":\s*"(.*?)",\s*"url":\s*"(.*?)"/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        parsed.push({ name: match[1], url: match[2] });
    }
}

const categories: any[] = [];

for (const item of parsed) {
    let { name, url } = item;

    // Filter
    if (url && url.includes('/c/') && /\/c\/\d+$/.test(url)) {
        // Fix weird chars
        name = name.replace(/%[0-9a-fA-F]+/g, ''); // Remove URL encoded chars
        name = name.replace(/[^\w\s&ÇĞİÖŞÜçğıöşü,-]/g, '').trim();

        categories.push({ name, url });
    }
}

// Deduplicate by URL
const unique = new Map();
categories.forEach(c => unique.set(c.url, c.name));

const final = Array.from(unique.entries()).map(([url, name]) => ({ name, url }));

console.log('export const CATEGORIES = [');
final.forEach(c => {
    console.log(`    { name: '${c.name}', url: '${c.url}' },`);
});
console.log('];');
