
import * as cheerio from 'cheerio';
import * as fs from 'fs';

const html = fs.readFileSync('carrefour_cat_1015.html', 'utf-8');
const $ = cheerio.load(html);

console.log('Total Products:', $('.product-listing-item').length);

$('.product-listing-item').each((i, el) => {
    if (i > 2) return; // Show first 3
    const item = $(el);
    const name = item.find('.item-name').text().trim();
    const price = item.find('.item-price').text().trim();
    const link = item.find('a').attr('href');
    const image = item.find('img').attr('data-src') || item.find('img').attr('src');

    console.log(`Product ${i}:`);
    console.log(`  Name: ${name}`);
    console.log(`  Price: ${price}`);
    console.log(`  Link: ${link}`);
    console.log(`  Image: ${image}`);
});

// Pagination
console.log('Pagination:', $('.pagination').length);
console.log('Next Page:', $('.pagination-next').attr('href') || 'Not found');
