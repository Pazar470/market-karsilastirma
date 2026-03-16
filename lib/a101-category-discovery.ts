/**
 * A101 kategori keşfi: Tam otomasyon. API'yi C01..C30 ile tarar, children dönen her id'yi
 * ana kategori kabul eder; yaprak listesini çekip a101_categories.json yazar. Sitemap/slug
 * veya manuel id ekleme gerekmez; A101 yeni ana kategori eklediğinde (C22, C23 vb.) bir sonraki
 * taramada otomatik bulunur.
 */
import fs from 'fs';
import path from 'path';

const STORE_ID = 'VS032';
const SITEMAP_URL = 'https://www.a101.com.tr/sitemaps/categories-kapida.xml';
/** Sitemap yoksa veya hata verirse kullanılacak tüm bilinen ana kategori slug'ları (18 adet). */
const A101_ROOT_SLUGS_FALLBACK = [
    'meyve-sebze', 'et-tavuk-sarkuteri', 'sut-urunleri-kahvaltilik', 'firindan', 'temel-gida',
    'atistirmalik', 'su-icecek', 'donuk-hazir-yemek-meze', 'dondurulmus-urunler', 'temizlik-urunleri',
    'kisisel-bakim', 'kagit-urunleri', 'elektronik', 'anne-bebek', 'ev-yasam',
    'bayram', 'ramazan-ozel', 'evcil-hayvan',
];
/** Bilinen root slug'lar (sitemap uyarısı için fuzzy eşleşme) */
const KNOWN_ROOT_SLUGS = [
    'meyve-sebze', 'et-tavuk-sarkuteri', 'sut-kahvaltilik', 'sut-urunleri-kahvaltilik',
    'firin-pastane', 'firindan', 'temel-gida', 'atistirmalik', 'su-icecek',
    'hazir-yemek-meze', 'donuk-hazir-yemek-meze', 'dondurulmus-urunler', 'temizlik', 'temizlik-urunleri',
    'kisisel-bakim', 'kagit-urunleri', 'elektronik', 'anne-bebek', 'ev-yasam', 'bayram', 'ramazan-ozel', 'evcil-hayvan',
];

const A101_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Origin: 'https://www.a101.com.tr',
    Referer: 'https://www.a101.com.tr/',
};

const CACHE_FILE = 'a101_root_ids.json';

type RootEntry = { id: string; name: string };

/** API yanıtında root name gelmezse kullanılacak id→isim (sadece görüntü; keşif hep API taramasıyla). */
const ROOT_ID_DISPLAY_NAME: Record<string, string> = {
    C16: 'Evcil Hayvan', C20: 'Ramazan Özel', C21: 'Bayram',
};

/** Otomasyon: API'yi C01..C30 ile tarayıp children dönen her id'yi geçerli root kabul eder. */
async function discoverRootIdsFromApi(): Promise<{ id: string; name: string }[]> {
    const roots: { id: string; name: string }[] = [];
    const maxId = 30;
    for (let i = 1; i <= maxId; i++) {
        const id = 'C' + String(i).padStart(2, '0');
        try {
            const url = `https://rio.a101.com.tr/dbmk89vnr/CALL/Store/getProductsByCategory/${STORE_ID}?id=${id}&channel=SLOT&__culture=tr-TR&__platform=web&data=e30%3D&__isbase64=true`;
            const res = await fetch(url, { headers: A101_HEADERS });
            if (!res.ok) continue;
            const data: any = await res.json();
            const children = data?.children;
            const hasChildren = Array.isArray(children) && children.length > 0;
            if (!hasChildren) continue;
            const name =
                (data?.name && typeof data.name === 'string' && data.name.trim())
                    ? data.name.trim()
                    : (ROOT_ID_DISPLAY_NAME[id] || `Kategori ${id}`);
            roots.push({ id, name });
        } catch (_) {
            /* skip */
        }
    }
    return roots;
}

/** Tek bir slug için sayfadan Cxx id (ve isim) çıkarır. */
async function resolveSlugToId(slug: string, opts?: { silent?: boolean }): Promise<RootEntry | null> {
    const url = `https://www.a101.com.tr/kapida/${slug}`;
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': A101_HEADERS['User-Agent'], Accept: 'text/html,application/xhtml+xml' },
        });
        if (!res.ok) return null;
        const html = await res.text();
        let id = '';
        const jsonLdMatch = html.match(/id="categoryListStructuredJson"[^>]*>([\s\S]*?)<\/script>/i);
        if (jsonLdMatch && jsonLdMatch[1]) {
            try {
                const data = JSON.parse(jsonLdMatch[1].trim());
                if (data.breadcrumb && Array.isArray(data.breadcrumb.itemListElement)) {
                    const last = data.breadcrumb.itemListElement[data.breadcrumb.itemListElement.length - 1];
                    if (last?.item?.name && /^C\d+/.test(String(last.item.name))) id = (last.item.name as string).match(/^C\d+/)?.[0] || '';
                    else if (last?.item?.name) {
                        const nameStr = String(last.item.name);
                        const m = nameStr.match(/\b(C\d+)\b/);
                        if (m) id = m[1];
                    }
                }
                if (!id && data.description) id = (data.description as string).match(/^(C\d+)/)?.[1] || '';
            } catch (_) {
                /* ignore */
            }
        }
        if (!id) {
            const m = html.match(/"id"\s*:\s*"(C\d+)"/);
            if (m) id = m[1];
        }
        if (!id) return null;
        const nameFromSlug = slug.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
        return { id, name: nameFromSlug };
    } catch (e) {
        if (!opts?.silent) console.error(`   [A101] resolve ${slug}:`, (e as Error).message);
        return null;
    }
}

/** Slug → id eşlemesi (cache yokken veya yeni slug'lar için sayfa çekmeden önce varsayılan). */
const SLUG_TO_ID_DEFAULTS: Record<string, RootEntry> = {
    'meyve-sebze': { id: 'C01', name: 'Meyve & Sebze' },
    'et-tavuk-sarkuteri': { id: 'C04', name: 'Et & Tavuk & Şarküteri' },
    'sut-urunleri-kahvaltilik': { id: 'C05', name: 'Süt Ürünleri & Kahvaltılık' },
    'firindan': { id: 'C02', name: 'Fırından' },
    'temel-gida': { id: 'C07', name: 'Temel Gıda' },
    'atistirmalik': { id: 'C06', name: 'Atıştırmalık' },
    'su-icecek': { id: 'C08', name: 'Su & İçecek' },
    'donuk-hazir-yemek-meze': { id: 'C10', name: 'Donuk, Hazır Yemek & Meze' },
    'dondurulmus-urunler': { id: 'C09', name: 'Dondurulmuş Ürünler' },
    'temizlik-urunleri': { id: 'C11', name: 'Temizlik Ürünleri' },
    'kisisel-bakim': { id: 'C12', name: 'Kişisel Bakım' },
    'kagit-urunleri': { id: 'C13', name: 'Kağıt Ürünleri' },
    'elektronik': { id: 'C18', name: 'Elektronik' },
    'anne-bebek': { id: 'C14', name: 'Anne & Bebek' },
    'ev-yasam': { id: 'C15', name: 'Ev & Yaşam' },
    'evcil-hayvan': { id: 'C16', name: 'Evcil Hayvan' },
    'ramazan-ozel': { id: 'C20', name: 'Ramazan Özel' },
    'bayram': { id: 'C21', name: 'Bayram' },
};

/** Tüm root slug'lar için id listesini döndürür (cache okur, eksikleri varsayılan veya sayfadan çözer, cache yazar). */
async function resolveAllRootIds(slugs: string[], opts?: { silent?: boolean }): Promise<{ id: string; name: string }[]> {
    const cwd = process.cwd();
    const cachePath = path.join(cwd, CACHE_FILE);
    let cache: Record<string, RootEntry> = { ...SLUG_TO_ID_DEFAULTS };
    try {
        if (fs.existsSync(cachePath)) {
            const onDisk = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
            cache = { ...SLUG_TO_ID_DEFAULTS, ...onDisk };
        }
    } catch (_) {
        /* ignore */
    }

    const result: { id: string; name: string }[] = [];
    const toFetch: string[] = [];
    for (const slug of slugs) {
        const cached = cache[slug];
        if (cached?.id) {
            result.push(cached);
        } else {
            toFetch.push(slug);
        }
    }

    for (const slug of toFetch) {
        const resolved = await resolveSlugToId(slug, opts);
        if (resolved) {
            cache[slug] = resolved;
            result.push(resolved);
        }
        await new Promise((r) => setTimeout(r, 400));
    }

    try {
        fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf-8');
    } catch (_) {
        /* ignore */
    }
    return result;
}

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

export async function runA101CategoryDiscovery(opts?: { silent?: boolean; sitemapCheck?: boolean }): Promise<{ leafCount: number; rootCount: number; path: string }> {
    const outPath = path.join(process.cwd(), 'a101_categories.json');
    if (!opts?.silent) console.log('📂 A101: Kategori keşfi (API C01..C30 taranıyor → yaprak liste)...');

    const uniqueRoots = await discoverRootIdsFromApi();

    if (!opts?.silent) console.log(`   ${uniqueRoots.length} ana kategori bulundu.`);

    const allLeafCategories: { id: string; name: string; path: string }[] = [];
    for (const root of uniqueRoots) {
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
    return { leafCount: allLeafCategories.length, rootCount: uniqueRoots.length, path: outPath };
}
