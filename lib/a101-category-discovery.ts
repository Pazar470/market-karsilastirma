/**
 * A101 kategori keşfi: 15 ana parentId ile API'den yaprak listesini alıp a101_categories.json yazar.
 * İsteğe bağlı: sitemap'ten root slug'ları çekip "olası yeni ana kategori" uyarısı verir.
 * Taramadan önce çağrılır; yaprak listesi her turda güncel kalır.
 */
import fs from 'fs';
import path from 'path';

const STORE_ID = 'VS032';
const A101_PARENT_IDS = [
    { id: 'C01', name: 'Meyve & Sebze' },
    { id: 'C04', name: 'Et & Tavuk & Şarküteri' },
    { id: 'C05', name: 'Süt & Kahvaltılık' },
    { id: 'C02', name: 'Fırın & Pastane' },
    { id: 'C07', name: 'Temel Gıda' },
    { id: 'C06', name: 'Atıştırmalık' },
    { id: 'C08', name: 'Su & İçecek' },
    { id: 'C10', name: 'Hazır Yemek & Meze' },
    { id: 'C09', name: 'Dondurulmuş Ürünler' },
    { id: 'C11', name: 'Temizlik' },
    { id: 'C12', name: 'Kişisel Bakım' },
    { id: 'C13', name: 'Kağıt Ürünleri' },
    { id: 'C18', name: 'Elektronik' },
    { id: 'C14', name: 'Anne & Bebek' },
    { id: 'C15', name: 'Ev & Yaşam' },
];

const SITEMAP_URL = 'https://www.a101.com.tr/sitemaps/categories-kapida.xml';
/** Bilinen root slug'lar (sitemap ile karşılaştırma için; fuzzy eşleşme kullanılır) */
const KNOWN_ROOT_SLUGS = [
    'meyve-sebze', 'et-tavuk-sarkuteri', 'sut-kahvaltilik', 'sut-urunleri-kahvaltilik',
    'firin-pastane', 'firindan', 'temel-gida', 'atistirmalik', 'su-icecek',
    'hazir-yemek-meze', 'donuk-hazir-yemek-meze', 'dondurulmus-urunler', 'temizlik', 'temizlik-urunleri',
    'kisisel-bakim', 'kagit-urunleri', 'elektronik', 'anne-bebek', 'ev-yasam',
];

const A101_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Origin: 'https://www.a101.com.tr',
    Referer: 'https://www.a101.com.tr/',
};

function buildLeavesFromChildren(children: any[], rootName: string): { id: string; name: string; path: string }[] {
    const list: { id: string; name: string; path: string }[] = [];
    for (const child of children) {
        if (child.children && Array.isArray(child.children)) {
            for (const subChild of child.children) {
                list.push({
                    id: subChild.id,
                    name: subChild.name,
                    path: `${rootName} > ${child.name} > ${subChild.name}`,
                });
            }
        } else {
            list.push({
                id: child.id,
                name: child.name,
                path: `${rootName} > ${child.name}`,
            });
        }
    }
    return list;
}

export async function runA101SitemapCheck(opts?: { silent?: boolean }): Promise<string[]> {
    const res = await fetch(SITEMAP_URL, {
        headers: { 'User-Agent': A101_HEADERS['User-Agent'] },
    });
    if (!res.ok) return [];
    const text = await res.text();
    const locs = text.match(/<loc>(.*?)<\/loc>/g)?.map((l) => l.replace(/<\/?loc>/g, '')) || [];
    const roots = new Set<string>();
    for (const u of locs) {
        const parts = u.split('/').filter(Boolean);
        const kapidaIndex = parts.indexOf('kapida');
        if (kapidaIndex > -1 && parts[kapidaIndex + 1]) roots.add(parts[kapidaIndex + 1]);
    }
    const sortedRoots = [...roots].sort();
    const potentialMissing = sortedRoots.filter((root) => {
        return !KNOWN_ROOT_SLUGS.some(
            (known) => root.includes(known.split('-')[0]) || known.includes(root.split('-')[0])
        );
    });
    if (potentialMissing.length > 0 && !opts?.silent) {
        console.log('   ⚠️ A101 sitemap: Olası yeni ana kategori (listede yok):', potentialMissing.join(', '));
    }
    return potentialMissing;
}

export async function runA101CategoryDiscovery(opts?: { silent?: boolean; sitemapCheck?: boolean }): Promise<{ leafCount: number; path: string }> {
    const outPath = path.join(process.cwd(), 'a101_categories.json');
    if (!opts?.silent) console.log('📂 A101: Kategori keşfi (15 ana kategori → yaprak liste)...');
    const allLeafCategories: { id: string; name: string; path: string }[] = [];

    for (const root of A101_PARENT_IDS) {
        try {
            const url = `https://rio.a101.com.tr/dbmk89vnr/CALL/Store/getProductsByCategory/${STORE_ID}?id=${root.id}&channel=SLOT&__culture=tr-TR&__platform=web&data=e30%3D&__isbase64=true`;
            const response = await fetch(url, { headers: A101_HEADERS });
            const data: any = await response.json();
            if (data?.children && Array.isArray(data.children)) {
                const leaves = buildLeavesFromChildren(data.children, root.name);
                allLeafCategories.push(...leaves);
            } else {
                allLeafCategories.push({ id: root.id, name: root.name, path: root.name });
            }
        } catch (e) {
            if (!opts?.silent) console.error(`   Hata (${root.name}):`, e);
        }
    }

    const output = {
        market: 'A101',
        totalLeafCategories: allLeafCategories.length,
        categories: allLeafCategories,
    };
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
    if (!opts?.silent) console.log(`   a101_categories.json güncellendi (${allLeafCategories.length} yaprak).`);

    if (opts?.sitemapCheck !== false) await runA101SitemapCheck(opts);
    return { leafCount: allLeafCategories.length, path: outPath };
}
