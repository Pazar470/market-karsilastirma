/**
 * Şok otomatik probe: Birkaç kategoriyi dener, çalışanlardan ürün sayısı çeker,
 * sitedeki "X adet ürün listelendi" ile karşılaştırman için rapor üretir.
 * Hata veren URL'leri listeler; sen tarayıcıda açıp aktif mi kontrol edersin.
 *
 * Çalıştırma:
 *   npx ts-node --esm scripts/sok-probe.ts           → 6–8 örnek kategori, sayı karşılaştırmalı rapor
 *   npx ts-node --esm scripts/sok-probe.ts --hepsi  → Tüm kategoriler taranır, sadece hata veren URL'ler yazılır
 */

import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

const ROOT = process.cwd();

function sokSlug(name: string): string {
    let s = name.trim()
        .replace(/\s*&\s*/g, ' ve ')
        .replace(/\s+-\s+/g, ' ')
        .toLowerCase()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return s;
}

/** Sitede yazan "243 adet ürün listelendi" (veya benzeri) metnini yakala */
function parseSiteProductCount(html: string): number | null {
    const m = html.match(/(\d+)\s*adet\s*ürün\s*listelendi/i) || html.match(/(\d+)\s*adet\s*ürün/i);
    return m ? parseInt(m[1], 10) : null;
}

/** Aynı selector ile sayfa başına kaç ürün kartı var say */
function countProductsFromHtml(html: string): number {
    const $ = cheerio.load(html);
    let n = 0;
    $('div[class*="PLPProductListing_PLPCardsWrapper"] a[href*="-p-"]').each(() => { n++; });
    return n;
}

interface Category { id: string; name: string; path: string; url?: string }

async function probeOne(cat: Category): Promise<{
    ok: boolean;
    status?: number;
    url: string;
    page1Count?: number;
    page2Count?: number;
    siteStatedTotal?: number;
    error?: string;
}> {
    const baseUrl = `https://www.sokmarket.com.tr/${sokSlug(cat.name)}-c-${cat.id}`;
    try {
        const r1 = await fetch(baseUrl);
        if (!r1.ok) {
            return { ok: false, status: r1.status, url: baseUrl };
        }
        const html1 = await r1.text();
        const page1Count = countProductsFromHtml(html1);
        const siteStatedTotal = parseSiteProductCount(html1);

        let page2Count: number | undefined;
        const url2 = `${baseUrl}?page=2`;
        const r2 = await fetch(url2);
        if (r2.ok) {
            const html2 = await r2.text();
            page2Count = countProductsFromHtml(html2);
        }

        return {
            ok: true,
            url: baseUrl,
            page1Count,
            page2Count,
            siteStatedTotal: siteStatedTotal ?? undefined,
        };
    } catch (e: any) {
        return { ok: false, url: baseUrl, error: e?.message || String(e) };
    }
}

async function main() {
    const raw = fs.readFileSync(path.join(ROOT, 'sok_categories.json'), 'utf-8');
    const allCats: Category[] = JSON.parse(raw).categories;
    /** Sadece gerçek kategori (sayısal id), ürün gibi -p- içeren kayıtları atla */
    const cats = allCats.filter(c => /^\d+$/.test(String(c.id)));

    const probeAll = process.argv.includes('--hepsi');

    const toProbe = probeAll
        ? cats
        : (() => {
            const indices = [0, 1];
            const idx1770 = cats.findIndex(c => c.id === '1770');
            if (idx1770 >= 0) indices.push(idx1770);
            const mid = Math.floor(cats.length / 2);
            indices.push(mid, mid + 1);
            indices.push(cats.length - 1);
            const uniq = [...new Set(indices)].filter(i => i >= 0 && i < cats.length).slice(0, 8);
            return uniq.map(i => cats[i]);
        })();

    console.log(probeAll ? `ŞOK PROBE – Tüm kategoriler (${toProbe.length} adet)\n` : 'ŞOK PROBE – Seçilen kategoriler:\n');
    if (!probeAll) toProbe.forEach((c, i) => console.log(`  ${i + 1}. ${c.name} (${c.id})`));
    console.log('\nİstekler atılıyor...\n');

    const results: { cat: Category; r: Awaited<ReturnType<typeof probeOne>> }[] = [];
    for (const cat of toProbe) {
        const r = await probeOne(cat);
        results.push({ cat, r });
        await new Promise(rev => setTimeout(rev, 200));
    }

    const working = results.filter(x => x.r.ok);
    const failing = results.filter(x => !x.r.ok);

    if (probeAll) {
        console.log(`========== ÖZET: ${working.length} çalışan, ${failing.length} hata ==========\n`);
        console.log('========== DÖNÜŞ ALAMADIĞIMIZ URL\'LER (tarayıcıda açıp aktif mi kontrol et) ==========\n');
        failing.forEach(({ cat, r }) => console.log(`${r.url}  # ${cat.name} (${cat.id})`));
        console.log('\n# Yukarıdaki satırları kopyalayıp tarayıcıda tek tek deneyebilirsin.');
        return;
    }

    console.log('========== ÇALIŞAN KATEGORİLER (sen sitedeki sayıyla karşılaştır) ==========\n');
    for (const { cat, r } of working) {
        const p2 = r.page2Count !== undefined ? `, sayfa2: ${r.page2Count}` : '';
        const site = r.siteStatedTotal != null ? ` | Sitede yazan toplam: ${r.siteStatedTotal}` : '';
        console.log(`  ${cat.name} (${cat.id})`);
        console.log(`    URL: ${r.url}`);
        console.log(`    Bizim çektiğimiz: sayfa1: ${r.page1Count}${p2}${site}`);
        console.log('');
    }

    console.log('========== HATA VEREN / DÖNÜŞ ALAMADIĞIMIZ URL\'LER (tarayıcıda açıp kontrol et) ==========\n');
    for (const { cat, r } of failing) {
        console.log(`  ${cat.name} (${cat.id})`);
        console.log(`    URL: ${r.url}`);
        console.log(`    HTTP: ${r.status ?? 'istek hatası'}, ${r.error ?? ''}`);
        console.log('');
    }

    console.log('========== KOPYALA-YAPIŞTIR: Hata veren URL listesi ==========\n');
    failing.forEach(({ r }) => console.log(r.url));
    console.log('');
}

main().catch(e => console.error(e));
