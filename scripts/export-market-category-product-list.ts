/**
 * Migros, A101 ve Şok için "marketten gelen kategori + ürün adı" listesini üretir.
 * Veritabanına yazmaz; sadece docs/ altına CSV/TXT dosyaları yazar.
 * Kategorizasyon için tek Excel üzerinden ana/yaprak/ince yaprak + bildirim kolonlarını doldurmak amacıyla kullanılır.
 *
 * Çalıştırma (proje kökünden): npx ts-node --esm scripts/export-market-category-product-list.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

const ROOT = path.resolve(process.cwd());
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'X-Pweb-Device-Type': 'DESKTOP'
};

type Row = { market: string; kategoriKodu: string; kategoriYolu: string; kategoriAdi: string; urunAdi: string };

function a101ParentId(leafId: string): string {
    return leafId.slice(0, 3);
}

/** Şok sitesi "&" yerine "ve", " - " yerine tek boşluk kullanıyor. */
function sokSlug(name: string): string {
    let s = name.trim()
        .replace(/\s*&\s*/g, ' ve ')
        .replace(/\s+-\s+/g, ' ')
        .toLowerCase()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return s;
}

function escapeCsv(val: string): string {
    if (/[",\n\r]/.test(val)) return `"${val.replace(/"/g, '""')}"`;
    return val;
}

async function fetchA101List(rows: Row[]): Promise<void> {
    const raw = fs.readFileSync(path.join(ROOT, 'a101_categories.json'), 'utf-8');
    const a101Cats: { id: string; name: string; path: string }[] = JSON.parse(raw).categories;
    const byParent = new Map<string, { id: string; name: string; path: string }[]>();
    for (const cat of a101Cats) {
        const pid = a101ParentId(cat.id);
        if (!byParent.has(pid)) byParent.set(pid, []);
        byParent.get(pid)!.push({ id: cat.id, name: cat.name, path: cat.path });
    }

    const storeId = 'VS032';
    const a101Headers = {
        ...HEADERS,
        Origin: 'https://www.a101.com.tr',
        Referer: 'https://www.a101.com.tr/kapida',
    };

    let idx = 0;
    for (const [parentId, leaves] of byParent) {
        idx++;
        process.stdout.write(`\r[A101] ${idx}/${byParent.size} parent: ${parentId}`);
        const url = `https://rio.a101.com.tr/dbmk89vnr/CALL/Store/getProductsByCategory/${storeId}?id=${parentId}&channel=SLOT&__culture=tr-TR&__platform=web&data=e30%3D&__isbase64=true`;
        try {
            const res = await fetch(url, { headers: a101Headers });
            if (!res.ok) continue;
            const data: any = await res.json();
            let items: any[] = [];
            if (data.data && Array.isArray(data.data)) items.push(...data.data);
            if (data.children && Array.isArray(data.children)) {
                for (const child of data.children) {
                    if (child.products && Array.isArray(child.products)) items.push(...child.products);
                }
            }
            const leafIds = new Set(leaves.map(c => c.id));
            const leafMap = Object.fromEntries(leaves.map(c => [c.id, c]));
            for (const item of items) {
                const name = item.attributes?.name || item.name || '';
                const rawPrice = item.price?.discounted || item.price?.normal || 0;
                const price = rawPrice / 100;
                if (!name || price <= 0) continue;
                const productCategoryIds: string[] = (item.categories || []).map((c: any) => c.id).filter(Boolean);
                const matchedLeafId = productCategoryIds.find((id: string) => leafIds.has(id));
                if (!matchedLeafId) continue;
                const leaf = leafMap[matchedLeafId];
                rows.push({
                    market: 'A101',
                    kategoriKodu: leaf.id,
                    kategoriYolu: leaf.path,
                    kategoriAdi: leaf.name,
                    urunAdi: name
                });
            }
        } catch (e) {
            console.error(`\n[A101] parent ${parentId}:`, (e as Error).message);
        }
    }
    console.log('');
}

const SOK_MAX_PAGES = 100;

async function fetchSokList(rows: Row[]): Promise<void> {
    const raw = fs.readFileSync(path.join(ROOT, 'sok_categories.json'), 'utf-8');
    const sokCats: { id: string; name: string; path: string }[] = JSON.parse(raw).categories;
    let idx = 0;
    for (const cat of sokCats) {
        idx++;
        const baseUrl = `https://www.sokmarket.com.tr/${sokSlug(cat.name)}-c-${cat.id}`;
        let page = 1;
        while (page <= SOK_MAX_PAGES) {
            process.stdout.write(`\r[ŞOK] ${idx}/${sokCats.length} ${cat.name} (sayfa ${page})`);
            const url = page === 1 ? baseUrl : `${baseUrl}?page=${page}`;
            try {
                const res = await fetch(url);
                if (!res.ok) {
                    if (res.status === 404 && page > 1) break;
                    break;
                }
                const html = await res.text();
                const $ = cheerio.load(html);
                const products: { text: string }[] = [];
                $('div[class*="PLPProductListing_PLPCardsWrapper"] a[href*="-p-"]').each((_, el) => {
                    const text = $(el).text().trim();
                    if (text) products.push({ text });
                });
                if (products.length === 0) break;
                for (const p of products) {
                    const priceMatch = p.text.match(/(\d{1,3}(?:[.]\d{3})*(?:,\d{1,2})?)\s*(?:₺|TL)/i);
                    if (!priceMatch) continue;
                    const name = p.text.replace(priceMatch[0], '').trim();
                    if (!name) continue;
                    rows.push({
                        market: 'Şok',
                        kategoriKodu: cat.id,
                        kategoriYolu: cat.path,
                        kategoriAdi: cat.name,
                        urunAdi: name
                    });
                }
                page++;
                await new Promise(r => setTimeout(r, 120));
            } catch (e) {
                console.error(`\n[ŞOK] ${cat.name} (${cat.id}) sayfa ${page}:`, (e as Error).message);
                break;
            }
        }
    }
    console.log('');
}

async function fetchMigrosList(rows: Row[]): Promise<void> {
    const raw = fs.readFileSync(path.join(ROOT, 'migros_categories.json'), 'utf-8');
    const migrosCats: { prettyName: string; name: string; path: string }[] = JSON.parse(raw).categories;

    console.log('\n[Migros] kategorilerden ürün listesi alınıyor...');

    const urlFor = (code: string, page: number) =>
        `https://www.migros.com.tr/rest/search/screens/${code}?page=${page}`;

    let idx = 0;
    for (const cat of migrosCats) {
        idx++;
        let page = 1;
        for (;;) {
            process.stdout.write(`\r[Migros] ${idx}/${migrosCats.length} kategori: ${cat.name} (sayfa ${page})`);
            try {
                const res = await fetch(urlFor(cat.prettyName, page), { headers: HEADERS as any });
                if (!res.ok) break;
                const json: any = await res.json();
                const items = json.data?.storeProductInfos || json.data?.searchInfo?.storeProductInfos || [];
                if (!items || items.length === 0) break;

                for (const item of items) {
                    const name = item.name || '';
                    const price = (item.shownPrice || item.regularPrice || 0) / 100;
                    if (!name || price <= 0) continue;

                    rows.push({
                        market: 'Migros',
                        kategoriKodu: cat.prettyName,
                        kategoriYolu: cat.path,
                        kategoriAdi: cat.name,
                        urunAdi: name
                    });
                }
                page++;
            } catch (e) {
                console.error(`\n[Migros] ${cat.name} (${cat.prettyName}) hata:`, (e as Error).message);
                break;
            }
        }
    }
    console.log('');
}

async function main() {
    const rows: Row[] = [];
    const outDir = path.join(ROOT, 'docs');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    console.log('Migros, A101 ve Şok için kategori + ürün listesi alınıyor (DB yazılmıyor)...\n');
    await fetchA101List(rows);
    await fetchSokList(rows);
    await fetchMigrosList(rows);

    const header = 'Market\tKategori_Kodu\tKategori_Yolu\tKategori_Adi\tUrun_Adi\tBizim_Ana_Kategori\tBizim_Yaprak_Kategori\tBizim_Ince_Yaprak_Kategori\tBildirim_Secimi';
    const csvHeader = 'Market,Kategori_Kodu,Kategori_Yolu,Kategori_Adi,Urun_Adi,Bizim_Ana_Kategori,Bizim_Yaprak_Kategori,Bizim_Ince_Yaprak_Kategori,Bildirim_Secimi';

    const tsvLines = [
        header,
        ...rows.map(
            r =>
                `${r.market}\t${r.kategoriKodu}\t${r.kategoriYolu}\t${r.kategoriAdi}\t${r.urunAdi}\t\t\t\t`
        )
    ];
    const csvLines = [
        csvHeader,
        ...rows.map(r =>
            [
                r.market,
                r.kategoriKodu,
                r.kategoriYolu,
                r.kategoriAdi,
                r.urunAdi,
                '',
                '',
                '',
                ''
            ].map(escapeCsv).join(',')
        )
    ];

    const tsvPath = path.join(outDir, 'URUN-KATEGORI-LISTESI-3-MARKET.txt');
    const csvPath = path.join(outDir, 'URUN-KATEGORI-LISTESI-3-MARKET.csv');
    fs.writeFileSync(tsvPath, tsvLines.join('\n'), 'utf-8');
    fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf-8');

    console.log(`\nToplam ${rows.length} satır yazıldı.`);
    console.log(`  TXT (sekme ile): ${tsvPath}`);
    console.log(`  CSV: ${csvPath}`);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
