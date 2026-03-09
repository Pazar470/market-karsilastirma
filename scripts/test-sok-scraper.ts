/**
 * Şok scraper testi: Birkaç kategori için sayfa 1/2 ürün sayısı, URL, engelleme.
 * Çalıştırma: npx tsx scripts/test-sok-scraper.ts
 */
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'X-Pweb-Device-Type': 'DESKTOP',
};

const FETCH_TIMEOUT_MS = 15000;

function fetchWithTimeout(url: string): Promise<Response> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    return fetch(url, { headers: HEADERS, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

function findProductsInNextData(obj: any, depth = 0): any[] {
    if (depth > 12) return [];
    if (Array.isArray(obj) && obj.length > 0) {
        const first = obj[0];
        if (first && typeof first === 'object') {
            const name = first.name ?? first.productName ?? first.title;
            const price = first.price ?? first.shownPrice ?? first.salePrice ?? first.listPrice;
            if (name && typeof name === 'string' && price != null && Number(price) > 0) return obj;
        }
    }
    if (obj && typeof obj === 'object')
        for (const k of Object.keys(obj)) {
            const found = findProductsInNextData(obj[k], depth + 1);
            if (found.length > 0) return found;
        }
    return [];
}

function countProductsFromHtml(html: string, $: ReturnType<typeof cheerio.load>): { fromNextData: number; fromHtml: number; sampleNames: string[] } {
    const sampleNames: string[] = [];
    let fromNextData = 0;
    const nextMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (nextMatch) {
        try {
            const data = JSON.parse(nextMatch[1]);
            const list = findProductsInNextData(data);
            fromNextData = list.length;
            list.slice(0, 3).forEach((p: any) => {
                const name = p.name ?? p.productName ?? p.title ?? '';
                if (name) sampleNames.push(name.substring(0, 50));
            });
        } catch (_) {}
    }
    const links = $('a[href*="-p-"]').toArray();
    const fromHtml = links.length;
    if (sampleNames.length === 0 && links.length > 0) {
        links.slice(0, 3).forEach((el) => {
            const t = $(el).text().trim().replace(/\s+/g, ' ').substring(0, 50);
            if (t) sampleNames.push(t);
        });
    }
    return { fromNextData, fromHtml, sampleNames };
}

async function testCategory(cat: { id: string; name: string; url?: string }, pageNum: 1 | 2) {
    const baseUrl = (cat.url || '').replace(/\?.*$/, '').replace(/(sokmarket\.com\.tr)\/+/, '$1/');
    const url = pageNum === 1 ? baseUrl : `${baseUrl}?page=${pageNum}`;
    try {
        const res = await fetchWithTimeout(url);
        const html = await res.text();
        const $ = cheerio.load(html);
        const stats = countProductsFromHtml(html, $);
        const hasNextData = !!html.match(/<script id="__NEXT_DATA__"/);
        return {
            ok: res.ok,
            status: res.status,
            hasNextData,
            ...stats,
            htmlLength: html.length,
        };
    } catch (e: any) {
        return { ok: false, status: 0, error: e?.message || String(e), fromNextData: 0, fromHtml: 0, sampleNames: [], htmlLength: 0 };
    }
}

async function main() {
    const pathToSok = path.join(process.cwd(), 'sok_categories.json');
    if (!fs.existsSync(pathToSok)) {
        console.error('sok_categories.json bulunamadı.');
        process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(pathToSok, 'utf-8'));
    const categories = data.categories || data;

    const toTest = [
        categories.find((c: any) => c.id === '20382' || c.name === 'Kuruyemiş'),
        categories.find((c: any) => c.id === '460'),
        categories.find((c: any) => c.id === '20376'),
        categories.find((c: any) => c.id === '1790'),
    ].filter(Boolean);

    if (toTest.length === 0) {
        console.log('Test kategorileri bulunamadı. İlk 3 kategori kullanılıyor.');
        toTest.push(...categories.slice(0, 3));
    }

    console.log('=== ŞOK SCRAPER TEST ===\n');
    console.log(`Kategori dosyası: ${categories.length} kategori. Test: ${toTest.length} kategori.\n`);

    for (const cat of toTest) {
        const name = cat.name || cat.id;
        const url = (cat.url || '').replace(/\/\/+/g, '/');
        console.log(`--- ${name} (id: ${cat.id}) ---`);
        console.log(`  URL: ${url}`);

        const p1 = await testCategory(cat, 1);
        if (p1.error) {
            console.log(`  Sayfa 1: HATA ${p1.error}`);
        } else {
            console.log(`  Sayfa 1: HTTP ${p1.status} | __NEXT_DATA__: ${p1.hasNextData ? 'var' : 'yok'} | Ürün (JSON): ${p1.fromNextData} | Ürün (a[href*="-p-"]): ${p1.fromHtml} | HTML: ${p1.htmlLength} byte`);
            if (p1.sampleNames.length) console.log(`  Örnek: ${p1.sampleNames.join(' | ')}`);
        }

        const p2 = await testCategory(cat, 2);
        if (p2.error) {
            console.log(`  Sayfa 2: HATA ${p2.error}`);
        } else {
            console.log(`  Sayfa 2: HTTP ${p2.status} | Ürün (JSON): ${p2.fromNextData} | Ürün (link): ${p2.fromHtml}`);
        }

        console.log('');
        await new Promise((r) => setTimeout(r, 400));
    }

    console.log('--- Özet ---');
    console.log('  - URL\'de çift slash (//) varsa scraper baseUrl.replace(/\\\\/?.*$/, "").replace(/\\\\/\\\\/+/g, "/") ile düzeltmeli.');
    console.log('  - __NEXT_DATA__ varsa ürünler oradan; yoksa a[href*="-p-"] + metin parse.');
    console.log('  - Sayfa 2 boşsa pagination biter; doluysa tüm sayfalar taranıyor (max 200).');
}

main().catch(console.error);
