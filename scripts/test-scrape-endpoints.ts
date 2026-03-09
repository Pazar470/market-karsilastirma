/**
 * Tarama uç noktalarını test eder: A101, Şok, Migros.
 * Her market için birkaç senaryo (OK, 404, sayfalama, URL formatı) kontrol edilir.
 * Çalıştırma: npx ts-node --esm scripts/test-scrape-endpoints.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const root = process.cwd();

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'X-Pweb-Device-Type': 'DESKTOP'
};

function sokSlug(name: string): string {
    let s = name.trim()
        .replace(/\s*&\s*/g, ' ve ')
        .replace(/\s+-\s+/g, ' ')
        .toLowerCase()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return s;
}

// ----- A101 -----
async function testA101() {
    console.log('\n========== A101 TEST ==========\n');
    const storeId = 'VS032';
    const parents = ['C01', 'C05', 'C07']; // Meyve/Sebze, Süt/Kahvaltılık, Temel Gıda

    for (const parentId of parents) {
        const url = `https://rio.a101.com.tr/dbmk89vnr/CALL/Store/getProductsByCategory/${storeId}?id=${parentId}&channel=SLOT&__culture=tr-TR&__platform=web&data=e30%3D&__isbase64=true`;
        const headers = { ...HEADERS, Origin: 'https://www.a101.com.tr', Referer: 'https://www.a101.com.tr/kapida' };
        try {
            const res = await fetch(url, { headers });
            const text = await res.text();
            console.log(`  Parent ${parentId}: HTTP ${res.status}`);
            if (!res.ok) {
                console.log(`    Body: ${text.slice(0, 300)}`);
                continue;
            }
            const data = JSON.parse(text);
            let items: any[] = [];
            if (data.data && Array.isArray(data.data)) items = data.data;
            if (data.children && Array.isArray(data.children)) {
                for (const child of data.children) {
                    if (child.products && Array.isArray(child.products)) items.push(...child.products);
                }
            }
            console.log(`    Ürün sayısı: ${items.length}`);
            if (items.length > 0) {
                const sample = items[0];
                const name = sample.attributes?.name || sample.name || '-';
                console.log(`    Örnek: ${String(name).slice(0, 50)}`);
            }
        } catch (e: any) {
            console.log(`  Parent ${parentId}: HATA ${e?.message || e}`);
        }
    }

    // pageNumber ile istek 400 dönmeli (API desteklemiyor)
    const urlPaginated = `https://rio.a101.com.tr/dbmk89vnr/CALL/Store/getProductsByCategory/${storeId}?id=C05&channel=SLOT&__culture=tr-TR&__platform=web&data=${encodeURIComponent(Buffer.from(JSON.stringify({ pageNumber: 2 })).toString('base64') + '=')}&__isbase64=true`;
    const headers = { ...HEADERS, Origin: 'https://www.a101.com.tr', Referer: 'https://www.a101.com.tr/kapida' };
    try {
        const res = await fetch(urlPaginated, { headers });
        console.log(`  Sayfalama (pageNumber=2) denemesi: HTTP ${res.status} ${res.status === 400 ? '(beklendi)' : ''}`);
    } catch (e: any) {
        console.log(`  Sayfalama denemesi: ${e?.message}`);
    }
}

// ----- ŞOK -----
async function testSok() {
    console.log('\n========== ŞOK TEST ==========\n');
    const raw = fs.readFileSync(path.join(root, 'sok_categories.json'), 'utf-8');
    const { categories } = JSON.parse(raw);
    const total = categories.length;

    // Örnekler: ilk 5, ortadan 5, son 5 + bilinen 404 olan isimler
    const known404Names = ['Fırından Sıcak', 'Meyve & Sebze', 'Kedi Maması', 'Elektronik', 'Kaşar Peynir', 'Bulaşık', 'Oyuncak'];
    const indices = [0, 1, 2, 3, 4, Math.floor(total / 2) - 2, Math.floor(total / 2) - 1, Math.floor(total / 2), total - 3, total - 2, total - 1];
    const toTest = new Map<string, typeof categories[0]>();
    for (const i of indices) {
        if (i >= 0 && i < total) toTest.set(categories[i].name, categories[i]);
    }
    for (const name of known404Names) {
        const cat = categories.find((c: any) => c.name === name);
        if (cat) toTest.set(cat.name, cat);
    }
    // Tüm kategorileri tek tek test et (404 sayısı için)
    let okCount = 0;
    let failCount = 0;
    const failed: { name: string; id: string; url: string; status: number }[] = [];

    for (const cat of categories) {
        const slug = sokSlug(cat.name);
        const builtUrl = `https://www.sokmarket.com.tr/${slug}-c-${cat.id}`;
        try {
            const res = await fetch(builtUrl, { redirect: 'follow' });
            if (res.ok) okCount++; else { failCount++; failed.push({ name: cat.name, id: cat.id, url: builtUrl, status: res.status }); }
        } catch (_) { failCount++; failed.push({ name: cat.name, id: cat.id, url: builtUrl, status: -1 }); }
        await new Promise(r => setTimeout(r, 80));
    }

    console.log(`  Toplam kategori: ${total}`);
    console.log(`  HTTP 200: ${okCount}`);
    console.log(`  Hata (4xx/5xx): ${failCount}`);
    if (failed.length > 0) {
        console.log('\n  Hata veren kategoriler (ilk 35):');
        failed.slice(0, 35).forEach(f => console.log(`    [${f.status}] ${f.name} (${f.id}) => ${f.url}`));
    }

    // JSON'daki url alanı bozuk mu kontrol (slash eksik)
    const first = categories[0];
    const jsonUrl = (first as any).url || '';
    const hasSlash = jsonUrl.includes('.tr/');
    console.log(`\n  sok_categories.json 'url' alanı: .tr/ var mı? ${hasSlash ? 'Evet' : 'Hayır (düzeltilmeli)'}`);
    if (!hasSlash && jsonUrl) console.log(`    Örnek: ${jsonUrl}`);
}

// ----- MİGROS -----
async function testMigros() {
    console.log('\n========== MİGROS TEST ==========\n');
    const raw = fs.readFileSync(path.join(root, 'migros_categories.json'), 'utf-8');
    const { categories } = JSON.parse(raw);
    const samples = categories.slice(0, 3);
    for (const cat of samples) {
        const prettyName = (cat as any).prettyName;
        const url1 = `https://www.migros.com.tr/rest/search/screens/${prettyName}?page=1`;
        const url2 = `https://www.migros.com.tr/rest/search/screens/${prettyName}?page=2`;
        try {
            const r1 = await fetch(url1, { headers: HEADERS });
            const j1 = r1.ok ? await r1.json() : null;
            const items1 = j1?.data?.storeProductInfos || j1?.data?.searchInfo?.storeProductInfos || [];
            const r2 = await fetch(url2, { headers: HEADERS });
            const j2 = r2.ok ? await r2.json() : null;
            const items2 = j2?.data?.storeProductInfos || j2?.data?.searchInfo?.storeProductInfos || [];
            console.log(`  ${cat.name} (${prettyName}): sayfa1=${r1.status} (${items1.length} ürün), sayfa2=${r2.status} (${items2.length} ürün)`);
        } catch (e: any) {
            console.log(`  ${cat.name}: HATA ${e?.message}`);
        }
    }
}

async function main() {
    console.log('Tarama uç noktaları test ediliyor...');
    await testA101();
    await testSok();
    await testMigros();
    console.log('\n========== TEST BİTTİ ==========\n');
}

main().catch(e => console.error(e));
