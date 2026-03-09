
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function testPaginationAndRegex() {
    // 1. Test Regex Improvement
    const dirtyText = "Letoon Erkek Trekking Ayakkabı 42799,00₺699,00₺";
    console.log(`\n--- Regex Test on "${dirtyText}" ---`);

    // Old Regex
    const oldRegex = /(\d{1,4}(?:[.,]\d{0,2})?)\s*₺?/;
    const oldMatches = dirtyText.match(new RegExp(oldRegex, 'g'));
    console.log('Old Regex Matches:', oldMatches);

    // New Regex: Strict currency, better number format
    // Requires TL or ₺
    // Digits, optional dots, comma, decimals.
    const newRegex = /(\d{1,3}(?:[.]\d{3})*(?:,\d{1,2})?)\s*(?:₺|TL)/i;
    const newMatches = dirtyText.match(new RegExp(newRegex, 'g'));
    console.log('New Regex Matches:', newMatches);

    if (newMatches) {
        const lastMatch = newMatches[newMatches.length - 1];
        console.log('Selected Price String:', lastMatch);
        // Clean
        const clean = lastMatch.replace(/₺|TL/gi, '').trim();
        console.log('Cleaned:', clean);
    }

    // 2. Test Pagination
    const catUrl = 'https://www.sokmarket.com.tr/giyim-ayakkabi-ve-aksesuar-c-20886';
    const page2Url = `${catUrl}?page=2`;

    console.log(`\n--- Pagination Test ---`);
    console.log(`Fetching Page 1: ${catUrl}`);
    const res1 = await fetch(catUrl);
    const html1 = await res1.text();
    const $1 = cheerio.load(html1);
    const prod1 = $1('a[href*="-p-"]').first().text().trim();
    console.log('Page 1 First Product:', prod1.substring(0, 50) + '...');

    console.log(`Fetching Page 2: ${page2Url}`);
    const res2 = await fetch(page2Url);
    const html2 = await res2.text();
    const $2 = cheerio.load(html2);
    const prod2 = $2('a[href*="-p-"]').first().text().trim();
    console.log('Page 2 First Product:', prod2.substring(0, 50) + '...');

    if (prod1 !== prod2) {
        console.log('✅ Pagination works! Content is different.');
    } else {
        console.log('❌ Pagination might not work (Content came back identical).');
    }
}

testPaginationAndRegex();
