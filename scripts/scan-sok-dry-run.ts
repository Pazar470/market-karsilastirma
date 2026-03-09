/**
 * Şok tam tarama — KURU KOŞU (veritabanına yazılmaz).
 * Sınırları zorlar: hem sok_categories.json hem siteden keşfedilen kategoriler,
 * kategori başına çok sayfa, alternatif selector. Sadece toplam benzersiz ürün sayısı çıkar.
 *
 * Karşılaştırma: Normal taramada ~2359 ürün; bu script ile maksimum ne çıkıyor?
 *
 * Çalıştırma: npx tsx scripts/scan-sok-dry-run.ts
 * Çıktı: sok-dry-run-report.json + konsol özeti
 */
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const FETCH_TIMEOUT_MS = 30000;
const MAX_PAGES_PER_CATEGORY = 80;
const DELAY_BETWEEN_PAGES_MS = 250;
const DELAY_BETWEEN_CATEGORIES_MS = 300;

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

const SOK_PARENT_CATEGORIES = [
    { name: 'Yemeklik Malzemeler', url: 'https://www.sokmarket.com.tr/yemeklik-malzemeler-c-1770' },
    { name: 'Et & Tavuk & Şarküteri', url: 'https://www.sokmarket.com.tr/et-ve-tavuk-ve-sarkuteri-c-160' },
    { name: 'Meyve & Sebze', url: 'https://www.sokmarket.com.tr/meyve-ve-sebze-c-20' },
    { name: 'Süt & Süt Ürünleri', url: 'https://www.sokmarket.com.tr/sut-ve-sut-urunleri-c-460' },
    { name: 'Kahvaltılık', url: 'https://www.sokmarket.com.tr/kahvaltilik-c-890' },
    { name: 'Atıştırmalıklar', url: 'https://www.sokmarket.com.tr/atistirmaliklar-c-20376' },
    { name: 'İçecek', url: 'https://www.sokmarket.com.tr/icecek-c-20505' },
    { name: 'Ekmek & Pastane', url: 'https://www.sokmarket.com.tr/ekmek-ve-pastane-c-1250' },
    { name: 'Dondurulmuş Ürünler', url: 'https://www.sokmarket.com.tr/dondurulmus-urunler-c-1550' },
    { name: 'Dondurma', url: 'https://www.sokmarket.com.tr/dondurma-c-31102' },
    { name: 'Temizlik', url: 'https://www.sokmarket.com.tr/temizlik-c-20647' },
    { name: 'Kağıt Ürünler', url: 'https://www.sokmarket.com.tr/kagit-urunler-c-20875' },
    { name: 'Kişisel Bakım & Kozmetik', url: 'https://www.sokmarket.com.tr/kisisel-bakim-ve-kozmetik-c-20395' },
    { name: 'Anne - Bebek & Çocuk', url: 'https://www.sokmarket.com.tr/anne-bebek-ve-cocuk-c-20634' },
    { name: 'Oyuncak', url: 'https://www.sokmarket.com.tr/oyuncak-c-20644' },
    { name: 'Ev & Yaşam', url: 'https://www.sokmarket.com.tr/ev-ve-yasam-c-20898' },
    { name: 'Evcil Dostlar', url: 'https://www.sokmarket.com.tr/evcil-dostlar-c-20880' },
    { name: 'Giyim & Aksesuar', url: 'https://www.sokmarket.com.tr/giyim-ayakkabi-ve-aksesuar-c-20886' },
    { name: 'Elektronik', url: 'https://www.sokmarket.com.tr/elektronik-c-22769' },
];

function fetchWithTimeout(url: string): Promise<Response> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    return fetch(url, { headers: HEADERS, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

type CatEntry = { id: string; name: string; path?: string; url: string };

function extractProductsFromHtml(html: string, $: ReturnType<typeof cheerio.load>): { link: string; name: string; price: number }[] {
    const out: { link: string; name: string; price: number }[] = [];
    // Birincil selector (liste sayfası kartları)
    const primary = $('div[class*="PLPProductListing_PLPCardsWrapper"] a[href*="-p-"]').toArray();
    for (const el of primary) {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        const priceMatch = text.match(/(\d{1,3}(?:[.]\d{3})*(?:,\d{1,2})?)\s*(?:₺|TL)/i);
        if (!href || !priceMatch) continue;
        const price = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));
        const name = text.replace(priceMatch[0], '').trim();
        if (!name || price <= 0) continue;
        const link = href.startsWith('http') ? href : `https://www.sokmarket.com.tr${href.startsWith('/') ? '' : '/'}${href}`;
        out.push({ link, name, price });
    }
    // Alternatif: genel -p- linkleri (bazı sayfalarda farklı wrapper olabilir)
    if (out.length === 0) {
        $('a[href*="-p-"]').each((_, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            const priceMatch = text.match(/(\d{1,3}(?:[.]\d{3})*(?:,\d{1,2})?)\s*(?:₺|TL)/i);
            if (!href || !priceMatch) return;
            const price = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));
            const name = text.replace(priceMatch[0], '').trim();
            if (!name || price <= 0) return;
            const link = href.startsWith('http') ? href : `https://www.sokmarket.com.tr${href.startsWith('/') ? '' : '/'}${href}`;
            if (!out.some((o) => o.link === link)) out.push({ link, name, price });
        });
    }
    return out;
}

async function scrapeCategoryFull(cat: CatEntry): Promise<{ products: Map<string, { name: string; price: number }>; pages: number; errors: string[] }> {
    const byLink = new Map<string, { name: string; price: number }>();
    const errors: string[] = [];
    let pages = 0;
    const baseUrl = cat.url.split('?')[0];

    for (let page = 1; page <= MAX_PAGES_PER_CATEGORY; page++) {
        const url = page === 1 ? baseUrl : `${baseUrl}?page=${page}`;
        try {
            const res = await fetchWithTimeout(url);
            if (!res.ok) {
                errors.push(`HTTP ${res.status}`);
                break;
            }
            const html = await res.text();
            const $ = cheerio.load(html);
            const items = extractProductsFromHtml(html, $);
            if (items.length === 0) break;
            for (const p of items) byLink.set(p.link, { name: p.name, price: p.price });
            pages++;
            if (page < MAX_PAGES_PER_CATEGORY) await new Promise((r) => setTimeout(r, DELAY_BETWEEN_PAGES_MS));
        } catch (e) {
            errors.push(String(e instanceof Error ? e.message : e));
            break;
        }
    }
    return { products: byLink, pages, errors };
}

async function discoverCategoryUrls(): Promise<CatEntry[]> {
    const seen = new Set<string>();
    const out: CatEntry[] = [];
    for (const parent of SOK_PARENT_CATEGORIES) {
        try {
            const res = await fetchWithTimeout(parent.url);
            if (!res.ok) continue;
            const html = await res.text();
            const $ = cheerio.load(html);
            $('a[href*="-c-"]').each((_, el) => {
                const href = $(el).attr('href');
                const name = $(el).text().trim();
                if (!href || !name || href.includes('-p-')) return;
                const full = href.startsWith('http') ? href : `https://www.sokmarket.com.tr${href.startsWith('/') ? '' : '/'}${href}`;
                if (seen.has(full)) return;
                seen.add(full);
                const idMatch = full.match(/-c-(\d+)/);
                out.push({ id: idMatch ? idMatch[1] : full, name, url: full });
            });
            await new Promise((r) => setTimeout(r, 200));
        } catch (_) {}
    }
    return out;
}

async function main() {
    const cwd = process.cwd();
    const reportPath = path.join(cwd, 'sok-dry-run-report.json');

    console.log('Şok kuru koşu (DB yok) — sınırları zorluyoruz…\n');

    // 1) sok_categories.json (sadece -c- olanlar)
    let categories: CatEntry[] = [];
    const sokPath = path.join(cwd, 'sok_categories.json');
    if (fs.existsSync(sokPath)) {
        const data = JSON.parse(fs.readFileSync(sokPath, 'utf-8'));
        const arr = data.categories || data;
        for (const c of arr) {
            if (c.url && String(c.url).includes('-c-') && !String(c.url).includes('-p-'))
                categories.push({ id: c.id, name: c.name, path: c.path, url: c.url });
        }
        console.log(`sok_categories.json: ${categories.length} kategori.\n`);
    }

    // 2) Siteden keşfet, URL ile dedupe
    console.log('Siteden ek kategori keşfediliyor…');
    const discovered = await discoverCategoryUrls();
    const urlSet = new Set(categories.map((c) => c.url));
    const discoveredOnly: { name: string; url: string }[] = [];
    for (const d of discovered) {
        if (!urlSet.has(d.url)) {
            urlSet.add(d.url);
            categories.push(d);
            discoveredOnly.push({ name: d.name, url: d.url });
        }
    }
    console.log(`Keşfedilen ek kategori: ${discoveredOnly.length}. Toplam hedef: ${categories.length}.`);
    if (discoveredOnly.length > 0) {
        console.log('Ek kategoriler (sadece siteden keşfedilenler):');
        discoveredOnly.forEach((c) => console.log(`  - ${c.name}\n    ${c.url}`));
        console.log('');
    }

    const allByLink = new Map<string, { name: string; price: number; category: string }>();
    const byCategory: { name: string; url: string; urunSayisi: number; sayfaSayisi: number; hatalar: string[] }[] = [];
    let idx = 0;

    for (const cat of categories) {
        idx++;
        process.stdout.write(`  [${idx}/${categories.length}] ${cat.name.substring(0, 40)}… `);
        const { products, pages, errors } = await scrapeCategoryFull(cat);
        let newCount = 0;
        for (const [link, v] of products) {
            if (!allByLink.has(link)) {
                allByLink.set(link, { ...v, category: cat.name });
                newCount++;
            }
        }
        byCategory.push({
            name: cat.name,
            url: cat.url,
            urunSayisi: products.size,
            sayfaSayisi: pages,
            hatalar: errors,
        });
        console.log(`${products.size} ürün, ${pages} sayfa.`);
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_CATEGORIES_MS));
    }

    const totalUnique = allByLink.size;
    const REF_CURRENT = 2359;
    const report = {
        tarih: new Date().toISOString(),
        kuruKosuToplamBenzersizUrun: totalUnique,
        normalTaramaReferans: REF_CURRENT,
        fark: totalUnique - REF_CURRENT,
        kategoriSayisi: categories.length,
        /** Sadece siteden keşfedilen (sok_categories.json'da olmayan) kategoriler; indirim/ramazan vb. çakışan listeler olabilir */
        discoveredCategories: discoveredOnly,
        byCategory: byCategory.sort((a, b) => b.urunSayisi - a.urunSayisi),
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

    console.log('\n--- ÖZET ---');
    console.log(`Toplam benzersiz ürün (kuru koşu): ${totalUnique.toLocaleString('tr-TR')}`);
    console.log(`Mevcut tarama referansı: ${REF_CURRENT.toLocaleString('tr-TR')}`);
    console.log(`Fark: ${(totalUnique - REF_CURRENT).toLocaleString('tr-TR')}`);
    console.log(`Rapor: ${reportPath}`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
