
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

// Load our known map
// We can't import the map directly if it's not exported or if we want to avoid DB dep in this lightweight script
// For now, let's define the KNOWN_SLUGS based on what we know, or fetch from DB if needed.
// Better approach: Read map-categories.ts or just define the keys we care about.

const KNOWN_CATEGORIES = [
    // A101
    'Meyve & Sebze', 'Et & Tavuk & Şarküteri', 'Süt & Kahvaltılık',
    'Fırın & Pastane', 'Temel Gıda', 'Atıştırmalık', 'Su & İçecek',
    'Dondurulmuş Ürünler', 'Hazır Yemek & Meze', 'Temizlik',
    'Kişisel Bakım', 'Kağıt Ürünleri', 'Elektronik', 'Anne & Bebek', 'Ev & Yaşam',

    // Şok
    'Süt & Süt Ürünleri', 'Kahvaltılık', 'Yemeklik Malzemeler',
    'Atıştırmalıklar', 'İçecek', 'Dondurma', 'Kişisel Bakım & Kozmetik',
    'Anne Bebek & Çocuk', 'Oyuncak', 'Evcil Dostlar', 'Giyim Ayakkabı & Aksesuar'
];

async function checkA101() {
    console.log('🕵️  Checking A101 for new categories...');
    try {
        const res = await fetch('https://www.a101.com.tr/', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const html = await res.text();
        const $ = cheerio.load(html);

        const newFound: string[] = [];

        $('a[href*="/market/"]').each((_, el) => {
            const text = $(el).text().trim();
            const href = $(el).attr('href') || '';

            if (href.includes('-p-')) return;
            if (text.length < 3) return;
            if (['Giriş', 'Üye', 'Sepet', 'Kampanya'].some(k => text.includes(k))) return;

            // Fuzzy check against known
            const isKnown = KNOWN_CATEGORIES.some(k =>
                text.includes(k) || k.includes(text) || text.includes('Meyve') || text.includes('Gıda') // Simple heuristics
            );

            if (!isKnown) {
                newFound.push(`${text} (${href})`);
            }
        });

        const unique = [...new Set(newFound)];
        if (unique.length > 0) {
            console.warn(`🚨 A101 NOTICE: Found ${unique.length} potentially new categories!`);
            unique.forEach(c => console.log(`   - ${c}`));
        } else {
            console.log('✅ A101: All live categories seem covered.');
        }

    } catch (e) {
        console.error('Error checking A101:', e);
    }
}

async function checkSok() {
    console.log('🕵️  Checking Şok for new categories...');
    try {
        const res = await fetch('https://www.sokmarket.com.tr/', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const html = await res.text();
        const $ = cheerio.load(html);

        const newFound: string[] = [];

        $('a[href*="-c-"]').each((_, el) => {
            const text = $(el).text().trim();
            const href = $(el).attr('href') || '';

            const isKnown = KNOWN_CATEGORIES.some(k =>
                text === k || text.includes(k) || k.includes(text)
            );

            if (!isKnown) {
                newFound.push(`${text} (${href})`);
            }
        });

        const unique = [...new Set(newFound)];
        if (unique.length > 0) {
            console.warn(`🚨 ŞOK NOTICE: Found ${unique.length} potentially new categories!`);
            unique.forEach(c => console.log(`   - ${c}`));
        } else {
            console.log('✅ Şok: All live categories seem covered.');
        }

    } catch (e) {
        console.error('Error checking Şok:', e);
    }
}

async function run() {
    console.log('--- 🕵️ DISCOVERY AGENT STARTED ---');
    await checkA101();
    await checkSok();
    console.log('--- DISCOVERY AGENT FINISHED ---');
}

run();
