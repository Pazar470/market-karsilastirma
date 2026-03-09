const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const htmlPath = path.resolve(__dirname, '../debug-kapida.html');
const html = fs.readFileSync(htmlPath, 'utf-8');
const $ = cheerio.load(html);

console.log('Analyzing HTML structure...');

// 1. Look for common product containers
const potentialContainers = [
    '.product-list',
    '.product-grid',
    '.products',
    '[class*="product"]',
    '.swiper-slide',
    '.set-product-item',
    'ul li',
    'div[data-pk]', // Often used for product keys
    'a[href*="/p/"]' // Links to products often have /p/ or /urun/
];

potentialContainers.forEach(selector => {
    const count = $(selector).length;
    if (count > 0) {
        console.log(`Found ${count} elements matching "${selector}"`);
        // Print the first element's class and partial HTML to identify it
        const first = $(selector).first();
        console.log(`  - First match class: "${first.attr('class')}"`);
        console.log(`  - First match HTML snippet: ${first.html() ? first.html().substring(0, 100) : 'empty'}...`);
        console.log(`  - Parent class: "${first.parent().attr('class')}"`);
    }
});

// 2. Dump all unique classes containing "product"
const allElements = $('*');
const productClasses = new Set();
allElements.each((i, el) => {
    const className = $(el).attr('class');
    if (className) {
        className.split(/\s+/).forEach(cls => {
            if (cls.toLowerCase().includes('product')) {
                productClasses.add(cls);
            }
        });
    }
});

console.log('\nUnique classes containing "product":');
console.log(Array.from(productClasses).join(', '));
