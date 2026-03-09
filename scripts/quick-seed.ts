import { runFullScrapeBatch } from '../lib/scraper';

async function main() {
    console.log('--- Quick Data Seeding for A101 and Sok ---');
    try {
        // Scrape just 2 categories each so it's very fast
        await runFullScrapeBatch('A101', 2);
        console.log('✅ A101 Quick Seed Done');

        await runFullScrapeBatch('Sok', 2);
        console.log('✅ Sok Quick Seed Done');
    } catch (error) {
        console.error('Migration failed:', error);
    }
}

main();
