
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const CAT_URL = 'https://www.sokmarket.com.tr/temizlik-c-20647';

async function testPage(page: number) {
    const url = `${CAT_URL}?page=${page}`;
    console.log(`Fetching ${url}...`);

    try {
        const response = await fetch(url);
        const html = await response.text();
        const $ = cheerio.load(html);

        // Raw count
        const rawCount = $('a[href*="-p-"]').length;

        // Parsed count logic from sok.ts
        let parsedCount = 0;
        $('a[href*="-p-"]').each((_, element) => {
            const href = $(element).attr('href');
            let text = '';
            const getTextWithSpaces = (elem: any) => {
                $(elem).contents().each((_: any, node: any) => {
                    if (node.type === 'text') {
                        text += $(node).text().trim() + ' ';
                    } else if (node.type === 'tag' && node.name !== 'script' && node.name !== 'style') {
                        getTextWithSpaces(node);
                    }
                });
            };
            getTextWithSpaces(element);
            text = text.replace(/\s+/g, ' ').trim();

            if (href && text) {
                const priceRegex = /(?<!\d)(\d{1,3}(?:[.]\d{3})*(?:,\d{1,2})?)\s*(?:₺|TL)/gi;
                const matches = text.match(new RegExp(priceRegex));

                if (matches && matches.length > 0) {
                    parsedCount++;
                }
            }
        });

        console.log(`Page ${page}: Raw=${rawCount}, Parsed=${parsedCount}`);

    } catch (e) {
        console.error(`Error fetching page ${page}:`, e);
    }
}

async function run() {
    await testPage(1);
    await testPage(5);
    await testPage(10);
    // await testPage(20);
}

run();
