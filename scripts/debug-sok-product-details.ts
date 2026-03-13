import 'dotenv/config';
import { runSokProductDetailDebug } from '../lib/scraper';

async function main() {
    const maxCategories = Number(process.argv[2] ?? '2') || 2;
    const maxPerCategory = Number(process.argv[3] ?? '5') || 5;
    console.log(`SCRAPE_DEBUG=${process.env.SCRAPE_DEBUG} SCRAPE_DEBUG_LIMIT=${process.env.SCRAPE_DEBUG_LIMIT}`);
    await runSokProductDetailDebug(maxCategories, maxPerCategory);
}

main().catch((err) => {
    console.error('Şok ürün detay debug hata:', err);
    process.exit(1);
});

