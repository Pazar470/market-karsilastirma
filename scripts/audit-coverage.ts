
import { prisma } from '../lib/db';
// import fetch from 'node-fetch'; // Native fetch used

async function auditDB() {
    console.log('--- DATABASE INTEGRITY AUDIT ---');

    // 1. Check Unmapped Products
    const unmapped = await prisma.product.findMany({
        where: { categoryId: null },
        select: { id: true, name: true, category: true, prices: { take: 1, select: { market: true } } }
    });

    console.log(`\n[Database] Total Unmapped Products: ${unmapped.length}`);

    if (unmapped.length > 0) {
        // Group by Market Category
        const grouped: Record<string, number> = {};
        unmapped.forEach(p => {
            const key = `${p.prices[0]?.market.name || 'Unknown'} - ${p.category || 'No Category'}`;
            grouped[key] = (grouped[key] || 0) + 1;
        });

        console.log('Unmapped Counts by Category:');
        Object.entries(grouped)
            .sort(([, a], [, b]) => b - a)
            .forEach(([key, count]) => console.log(`- ${key}: ${count} products`));
    } else {
        console.log('✅ All products in DB are mapped to a Master Category.');
    }
}

async function auditA101Source() {
    console.log('\n--- A101 SOURCE AUDIT ---');
    // Fetch live menu to see ALL categories
    const url = 'https://www.a101.com.tr/b2c-gateway-service/menu/get-menu';

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!res.ok) {
            console.log(`Failed to fetch A101 menu: ${res.status}`);
            return;
        }

        const data: any = await res.json();
        const liveCategories = data.data || [];

        // Flatten live categories to get IDs and Names
        const liveMap: Record<string, string> = {}; // Name -> ID

        function traverse(node: any) {
            if (node.id && node.name) {
                // A101 IDs in menu might be UUIDs or "C01" style. Needs check.
                // Usually menu API returns UUIDs, but links contain the "C01" code or slugs.
                // Let's inspect the URL or slug.
                // Example slug: "/market/meyve-sebze-c-100" -> ID is likely hidden or needs parsing
                liveMap[node.name] = node.slug || node.url;
            }
            if (node.children) node.children.forEach(traverse);
            if (node.subCategories) node.subCategories.forEach(traverse);
        }

        liveCategories.forEach(traverse);

        console.log(`Found ${Object.keys(liveMap).length} categories in A101 Live Menu.`);

        // Current Scraper Categories (Manual List from lib/scraper/a101.ts)
        const CURRENT_SCRAPED = [
            'Meyve & Sebze', 'Et & Tavuk & Şarküteri', 'Süt & Kahvaltılık',
            'Fırın & Pastane', 'Temel Gıda', 'Atıştırmalık', 'Su & İçecek',
            'Hazır Yemek & Meze', 'Dondurulmuş Ürünler', 'Temizlik',
            'Kişisel Bakım', 'Kağıt Ürünleri', 'Elektronik', 'Anne & Bebek', 'Ev & Yaşam'
        ];

        console.log('\nChecking for MISSING major categories in our scraper list:');
        const significantKeywords = ['Gıda', 'Market', 'İçecek', 'Temizlik', 'Kozmetik', 'Bebek', 'Ev'];

        Object.keys(liveMap).forEach(liveName => {
            // Check if this live category seems relevant but is missing from our list
            // Simple fuzzy check: is it represented?
            const isCovered = CURRENT_SCRAPED.some(c =>
                c.toLowerCase().includes(liveName.toLowerCase()) ||
                liveName.toLowerCase().includes(c.toLowerCase())
            );

            // Filter out obviously non-market stuff if possible (e.g. 'Oto Aksesuar' might be ignored if we focus on food)
            // User wants EVERYTHING.
            if (!isCovered) {
                // Log it as potential missing
                console.log(`[?] Potential Missing: "${liveName}" (Slug: ${liveMap[liveName]})`);
            }
        });

    } catch (e) {
        console.error('Error auditing A101:', e);
    }
}

async function run() {
    await auditDB();
    await auditA101Source();
    prisma.$disconnect();
}

run().catch(e => console.error('Fatal Error:', e));
