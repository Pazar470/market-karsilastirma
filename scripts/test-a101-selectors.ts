
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

const dumpPath = path.resolve(__dirname, '../a101-dump.html');
const html = fs.readFileSync(dumpPath, 'utf-8');
const $ = cheerio.load(html);

console.log('Testing A101 Selectors...');

// Select all product cards in the main grid
const products = $('div[id^="product-card-"]');
console.log(`Found ${products.length} products.`);

products.each((i, el) => {
    if (i >= 5) return; // Limit to 5 for testing

    const name = $(el).find('h3[title]').attr('title')?.trim();
    // Price selector: Look for the current price span
    // Based on dump: <span class="text-base text-[#333]  not-italic font-medium leading-normal cursor-pointer">₺799,00</span>
    // OR <span class="text-base text-[#EA242A] ..."> for discounted items
    const priceText = $(el).find('section span.text-base.font-medium').text().trim();

    // Image selector
    // Based on dump: <img class="lozad" data-src="..."> OR just src if lazy loading handled differently
    const imgEl = $(el).find('img');
    const imgSrc = imgEl.attr('data-src') || imgEl.attr('src');

    // Link selector
    const link = $(el).find('a').attr('href');

    console.log(`\nProduct ${i + 1}:`);
    console.log(`Name: ${name}`);
    console.log(`Price: ${priceText}`);
    console.log(`Image: ${imgSrc}`);
    console.log(`Link: ${link}`);
});
