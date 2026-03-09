
import * as cheerio from 'cheerio';
import * as fs from 'fs';

const html = fs.readFileSync('carrefour_dump.html', 'utf-8');
const $ = cheerio.load(html);

console.log('Title:', $('title').text());

// Check for JSON-LD
$('script[type="application/ld+json"]').each((i, el) => {
    console.log(`JSON-LD ${i}:`, $(el).html()?.substring(0, 100));
});

// Check for Product Cards
const products = $('.product-listing-item');
console.log('Product Cards found (selector .product-listing-item):', products.length);

if (products.length === 0) {
    console.log('Trying alternative selectors...');
    console.log('.product-item:', $('.product-item').length);
    console.log('.item-product:', $('.item-product').length);
    console.log('a[href*="/p-"]:', $('a[href*="/p-"]').length);
}

// Check for potential price pattern in text
const text = $('body').text();
const priceMatch = text.match(/\d+,\d{2}\s*TL/g);
if (priceMatch) {
    console.log('Price patterns found:', priceMatch.slice(0, 5));
} else {
    console.log('No price patterns found in body text.');
}
