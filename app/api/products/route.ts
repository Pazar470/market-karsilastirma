import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
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

/** categoryId ve tüm alt kategori id'lerini döndürür (yaprak seçilince sadece o, ana seçilince altları da). */
async function categoryIdAndDescendants(categoryId: string): Promise<string[]> {
    const all = await prisma.category.findMany({ select: { id: true, parentId: true } });
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

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const categories = searchParams.getAll('category');
    const categoryId = searchParams.get('categoryId');
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

    const categoryIdIn = categoryId ? await categoryIdAndDescendants(categoryId) : null;

    try {
        // Sadece güncel market: son taramada fiyatı gelen ürünler. Markette o gün yoksa göstermiyoruz.
        const priceMinDate = new Date();
        priceMinDate.setDate(priceMinDate.getDate() - 1); // Son 1 gün: günlük tarama — o gün markette yoksa bizde yok
        let products = await prisma.product.findMany({
            where: {
                AND: [
                    { categoryId: { not: null } },
                    { prices: { some: { date: { gte: priceMinDate } } } },
                    ...nameConditions,
                    categoryCondition,
                    { isSuspicious: false },
                    categoryIdIn ? { categoryId: { in: categoryIdIn } } : {},
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
                    include: {
                        market: true,
                    },
                    orderBy: {
                        date: 'desc',
                    },
                    // If market filter is applied, we ideally want to show the price FROM that market.
                    // But our UI takes prices[0]. 
                    // Let's filter the prices relation too if market is set, so prices[0] is the correct one.
                    where: market ? {
                        market: {
                            name: market
                        }
                    } : undefined,
                },
                masterCategory: true, // Include master category for sorting/filtering debugging
            },
            // Fetch all if sorting, otherwise page (increased to 300 to cover all markets)
            take: sortBy ? undefined : 300,
        });

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

        return NextResponse.json({
            products,
            facets
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
