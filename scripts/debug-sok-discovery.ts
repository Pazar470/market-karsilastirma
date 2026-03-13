import 'dotenv/config';
import { runSokDebugDiscovery } from '../lib/scraper';

async function main() {
    const max = Number(process.argv[2] ?? '5') || 5;
    console.log(`SCRAPE_DEBUG=${process.env.SCRAPE_DEBUG} SCRAPE_DEBUG_LIMIT=${process.env.SCRAPE_DEBUG_LIMIT}`);
    await runSokDebugDiscovery(max);
}

main().catch((err) => {
    console.error('Şok debug discovery hata:', err);
    process.exit(1);
});

