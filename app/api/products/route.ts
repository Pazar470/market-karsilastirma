import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getA101DisplayUrl } from '@/lib/utils';
import { ANA_KATEGORILER, type AnaKategori } from '@/lib/category-mapper';

export const dynamic = 'force-dynamic'; // Prevent caching of new products

/** Sidebar etiketi → ana kategori. Peynir/Süt/Yoğurt vb. tek ana kategoride (Süt Ürünleri) toplanır. */
const SIDEBAR_TO_ANA: Record<string, string> = {
    'Peynir': ANA_KATEGORILER.SUT_URUNLERI,
    'Süt': ANA_KATEGORILER.SUT_URUNLERI,
    'Yoğurt': ANA_KATEGORILER.SUT_URUNLERI,
    'Tereyağı': ANA_KATEGORILER.SUT_URUNLERI,
    'Yumurta': ANA_KATEGORILER.SUT_URUNLERI,
    'Sıvı Yağ': ANA_KATEGORILER.TEMEL_GIDA,
    'Çay': ANA_KATEGORILER.ICECEK,
    'Kahve': ANA_KATEGORILER.ICECEK,
    'Şeker': ANA_KATEGORILER.TEMEL_GIDA,
    'Un': ANA_KATEGORILER.TEMEL_GIDA,
    'Makarna': ANA_KATEGORILER.TEMEL_GIDA,
    'Bakliyat': ANA_KATEGORILER.TEMEL_GIDA,
    'Zeytin': ANA_KATEGORILER.TEMEL_GIDA,
    'Bal & Reçel': ANA_KATEGORILER.TEMEL_GIDA,
    'Kırmızı Et': ANA_KATEGORILER.ET_TAVUK_BALIK,
    'Beyaz Et': ANA_KATEGORILER.ET_TAVUK_BALIK,
    'Atıştırmalık': ANA_KATEGORILER.ATISTIRMALIK,
    'Temizlik': ANA_KATEGORILER.TEMIZLIK,
};
const ANA_SET = new Set(Object.values(ANA_KATEGORILER));

const CATEGORY_CACHE_TTL_MS = 60_000;
let categoryListCache: { data: { id: string; parentId: string | null }[]; ts: number } | null = null;

async function getCategoryList(): Promise<{ id: string; parentId: string | null }[]> {
    if (categoryListCache && Date.now() - categoryListCache.ts < CATEGORY_CACHE_TTL_MS) return categoryListCache.data;
    const data = await prisma.category.findMany({ select: { id: true, parentId: true } });
    categoryListCache = { data, ts: Date.now() };
    return data;
}

/** categoryId ve tüm alt kategori id'lerini döndürür (yaprak seçilince sadece o, ana seçilince altları da). */
async function categoryIdAndDescendants(categoryId: string): Promise<string[]> {
    const all = await getCategoryList();
    const ids = new Set<string>([categoryId]);
    let added = true;
    while (added) {
        added = false;
        for (const c of all) {
            if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) {
                ids.add(c.id);
                added = true;
            }
        }
    }
    return Array.from(ids);
}

/** Sadece her market için en son fiyatı bırakır (prices zaten date desc). */
function latestPricePerMarket<T extends { market: { id: string } }>(prices: T[]): T[] {
    const byMarket = new Map<string, T>();
    for (const p of prices) {
        if (!byMarket.has(p.market.id)) byMarket.set(p.market.id, p);
    }
    return Array.from(byMarket.values());
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const categories = searchParams.getAll('category');
    const categoryId = searchParams.get('categoryId');
    const categoryIdsParam = searchParams.getAll('categoryId'); // Çoklu kategori: ?categoryId=x&categoryId=y
    const productIdsParam = searchParams.get('productIds'); // Virgülle ayrılmış id listesi (alarm düzenleme için)
    const market = searchParams.get('market');
    const sortBy = searchParams.get('sortBy');

    const terms = query ? query.split(' ').filter(t => t.length > 0) : [];
    const nameConditions = terms.map(term => ({
        name: { contains: term, mode: 'insensitive' as const }
    }));

    // Filtre: sadece ana kategori (product.category) ile eşleşen ürünler. Peynir → Süt Ürünleri.
    const resolvedAna: AnaKategori[] = categories.length > 0
        ? categories.map(c => SIDEBAR_TO_ANA[c] ?? (ANA_SET.has(c as AnaKategori) ? (c as AnaKategori) : null)).filter((x): x is AnaKategori => x != null)
        : [];
    const categoryCondition = resolvedAna.length > 0
        ? { category: { in: resolvedAna } }
        : {};

    const idsToExpand = categoryIdsParam.length > 0 ? categoryIdsParam : (categoryId ? [categoryId] : []);
    let categoryIdIn: string[] | null = null;
    if (idsToExpand.length > 0) {
        const sets = await Promise.all(idsToExpand.map((id) => categoryIdAndDescendants(id)));
        const union = new Set(sets.flat());
        categoryIdIn = Array.from(union);
    }
    // q ve categoryId birlikte gelirse ikisini de uygula (sadece bu kategoride ara)

    const productIdsFilter = productIdsParam
        ? { id: { in: productIdsParam.split(',').map((s) => s.trim()).filter(Boolean) } }
        : {};

    try {
        // Sadece güncel market: son taramada fiyatı gelen ürünler. Markette o gün yoksa göstermiyoruz.
        const priceMinDate = new Date();
        priceMinDate.setDate(priceMinDate.getDate() - 1); // Son 1 gün: günlük tarama — o gün markette yoksa bizde yok
        let products = await prisma.product.findMany({
            where: {
                AND: [
                    productIdsParam ? {} : { categoryId: { not: null } },
                    { prices: { some: { date: { gte: priceMinDate } } } },
                    ...nameConditions,
                    categoryCondition,
                    { isSuspicious: false },
                    categoryIdIn ? { categoryId: { in: categoryIdIn } } : {},
                    Object.keys(productIdsFilter).length > 0 ? productIdsFilter : {},
                    market ? {
                        prices: {
                            some: {
                                market: {
                                    name: market
                                }
                            }
                        }
                    } : {}
                ]
            },
            include: {
                prices: {
                    include: { market: true },
                    orderBy: { date: 'desc' },
                    take: 10, // En son 10 fiyat (3–4 market × birkaç gün); sonra market başına 1'e indirilecek
                    where: market ? { market: { name: market } } : undefined,
                },
                masterCategory: true,
            },
            take: sortBy ? 500 : 300, // Sıralama olsa bile üst sınır (önceden sınırsız çekiliyordu)
        });

        // Her ürün için sadece market başına en son fiyatı bırak (günlük tarama = o günkü fiyat)
        products = products.map((p) => ({ ...p, prices: latestPricePerMarket(p.prices) }));

        // Smart Sort: Prioritize Products with Exact Category Match
        // E.g. Query "Kaşar" -> if product.masterCategory.name includes "Kaşar" -> Boost it
        if (!sortBy && query) {
            const lowerQuery = query.toLowerCase();
            products.sort((a, b) => {
                const aCat = a.masterCategory?.name.toLowerCase() || '';
                const bCat = b.masterCategory?.name.toLowerCase() || '';

                // Tier 1: Category exact includes query (e.g. "Kaşar Peyniri" includes "Kaşar")
                const aHit = aCat.includes(lowerQuery);
                const bHit = bCat.includes(lowerQuery);

                if (aHit && !bHit) return -1;
                if (!aHit && bHit) return 1;

                return 0;
            });
            // Debug Log
            // console.log('Smart Sort Applied. Top 3:', products.slice(0, 3).map(p => `${p.name} [${p.masterCategory?.name}]`));
        }

        const effectivePrice = (p: typeof products[0]) => {
            const first = p.prices[0];
            if (!first) return 0;
            return Number((first as any).campaignAmount ?? first.amount) || Number(first.amount);
        };

        if (sortBy) {
            products.sort((a, b) => {
                const prodA = a as any;
                const prodB = b as any;

                const priceA = effectivePrice(a);
                const priceB = effectivePrice(b);

                if (sortBy === 'priceAsc') {
                    if (priceA === 0) return 1;
                    if (priceB === 0) return -1;
                    return priceA - priceB;
                }

                if (sortBy === 'priceDesc') {
                    return priceB - priceA;
                }

                if (sortBy === 'unitPriceAsc') {
                    const unitPriceA = (prodA.quantityAmount && prodA.quantityAmount > 0) ? priceA / prodA.quantityAmount : priceA;
                    const unitPriceB = (prodB.quantityAmount && prodB.quantityAmount > 0) ? priceB / prodB.quantityAmount : priceB;

                    // Push items with 0 price or no quantity to the bottom
                    if (unitPriceA === 0) return 1;
                    if (unitPriceB === 0) return -1;

                    return unitPriceA - unitPriceB;
                }

                return 0;
            });
        }

        // 2. Calculate Facets (Categories) from the results
        // We do this BEFORE pagination if possible, but doing it on the page is faster and usually sufficient for "Refinement".
        // Actually, for correct facets, we should calculate on the whole set matching the query, but that's expensive.
        // Let's stick to facets of the returned products for now, or fetch all IDs first?
        // Fetching all matching products just for facets might be heavy. 
        // Let's assume Facets of top 300 items is a good enough approximation.

        const categoryCounts: Record<string, number> = {};
        products.forEach(p => {
            // Use the Market Category Path
            const cat = p.category;
            if (cat) {
                // Option A: Full Path Facet
                categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            }
        });

        const facets = Object.entries(categoryCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        // A101: Markette gör linki /kapida/u/ID 404 veriyor; gösterimde /kapida/[slug]_p-[id] kullan
        const productsWithDisplayUrls = products.map((p) => ({
            ...p,
            prices: p.prices.map((pr: any) =>
                pr.market?.name === 'A101' && p.marketKey
                    ? { ...pr, productUrl: getA101DisplayUrl(p.marketKey, p.name) ?? pr.productUrl }
                    : pr
            ),
        }));

        return NextResponse.json({
            products: productsWithDisplayUrls,
            facets
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
