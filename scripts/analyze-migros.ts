
import * as cheerio from 'cheerio';
import * as fs from 'fs';

const html = fs.readFileSync('migros_dump.html', 'utf-8');
const $ = cheerio.load(html);

console.log('Title:', $('title').text());
console.log('Product Cards found:', $('sm-list-page-item').length);

$('sm-list-page-item').each((i, el) => {
    if (i > 5) return;
    const name = $(el).find('.mat-mdc-card-title').text().trim() || $(el).find('a.name').text().trim();
    const price = $(el).find('.price').text().trim() || $(el).find('.amount').text().trim();
    console.log(`Product ${i}: ${name} - Price: ${price}`);
});

// Check for JSON LD
const jsonLd = $('script[type="application/ld+json"]').html();
if (jsonLd) {
    console.log('JSON-LD Found:', jsonLd.substring(0, 200));
}
