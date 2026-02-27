import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic'; // Prevent caching of new products

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const categories = searchParams.getAll('category');
    const categoryId = searchParams.get('categoryId');
    const market = searchParams.get('market');
    const sortBy = searchParams.get('sortBy');

    const terms = query ? query.split(' ').filter(t => t.length > 0) : [];
    const nameConditions = terms.map(term => ({
        name: { contains: term }
    }));

    // Build Category OR condition
    // Matches if product belongs to ANY of the selected categories
    const categoryCondition = categories.length > 0 ? {
        OR: categories.flatMap(cat => [
            { masterCategory: { name: { contains: cat } } },
            { category: { contains: cat } }
        ])
    } : {};

    try {
        let products = await prisma.product.findMany({
            where: {
                AND: [
                    ...nameConditions,
                    categoryCondition,
                    { isSuspicious: false },
                    categoryId ? { categoryId } : {},
                    // Market filtering needs to check if ANY of the prices belong to the market
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

        if (sortBy) {
            products.sort((a, b) => {
                const prodA = a as any;
                const prodB = b as any;

                const priceA = Number(a.prices[0]?.amount ?? 0);
                const priceB = Number(b.prices[0]?.amount ?? 0);

                if (sortBy === 'priceAsc') {
                    // 0 prices to bottom
                    if (priceA === 0) return 1;
                    if (priceB === 0) return -1;
                    return priceA - priceB;
                }

                if (sortBy === 'priceDesc') {
                    return priceB - priceA;
                }

                if (sortBy === 'unitPriceAsc') {
                    // Calculate unit price if quantity exists
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
