
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const dumpPath = path.resolve(__dirname, '../a101-dump.html');

try {
    const html = fs.readFileSync(dumpPath, 'utf-8');
    const $ = cheerio.load(html);

    console.log('Testing A101 Selectors...');

    // Select all product cards in the main grid
    // Based on dump analysis: <div id="product-card-...">
    const products = $('div[id^="product-card-"]');
    console.log(`Found ${products.length} products.`);

    products.each((i, el) => {
        if (i >= 5) return; // Limit to 5 for testing

        // Name
        const name = $(el).find('h3').attr('title')?.trim() || $(el).find('h3').text().trim();

        // Price
        // Adjusted selector based on dump: section.mt-2 > span.text-base
        const priceText = $(el).find('section span.text-base.font-medium').text().trim();

        // Image
        // Based on dump: <img ... data-src="...">
        const imgEl = $(el).find('img');
        const imgSrc = imgEl.attr('data-src') || imgEl.attr('src');

        // Link
        const link = $(el).find('a').attr('href');

        console.log(`\nProduct ${i + 1}:`);
        console.log(`Name: ${name}`);
        console.log(`Price: ${priceText}`);
        console.log(`Image: ${imgSrc}`);
        console.log(`Link: ${link}`);
    });

} catch (err) {
    console.error("Error reading or parsing file:", err);
}
