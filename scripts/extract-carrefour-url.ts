
import * as fs from 'fs';

const html = fs.readFileSync('carrefour_debug_sitemap.html', 'utf-8');

// Regex to find product URLs in the messy HTML
// Pattern: https://www.carrefoursa.com/{slug}/p-{id}
const regex = /https:\/\/www\.carrefoursa\.com\/[a-zA-Z0-9-]+\/p-\d+/g;
const matches = html.match(regex);

if (matches) {
    console.log(`Found ${matches.length} matches.`);
    console.log('Sample URL:', matches[0]);
    // Save to a file for the next script to use
    fs.writeFileSync('carrefour_target_url.txt', matches[0]);
} else {
    console.log('No matches found.');
    // Log snippet
    console.log('Snippet:', html.substring(0, 1000));
}
