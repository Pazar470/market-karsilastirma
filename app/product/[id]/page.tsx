import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NavigationButtons } from '@/components/navigation-buttons';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const PARALLEL_FETCH_TIMEOUT_MS = 10_000;

function latestPricePerMarket<T extends { market: { id: string } }>(prices: T[]): T[] {
    const byMarket = new Map<string, T>();
    for (const p of prices) {
        if (!byMarket.has(p.market.id)) byMarket.set(p.market.id, p);
    }
    return Array.from(byMarket.values());
}

async function getProduct(id: string) {
    const product = await prisma.product.findUnique({
        where: { id },
        include: {
            prices: {
                include: { market: true },
                orderBy: { date: 'desc' },
                take: 10,
            },
            masterCategory: true,
        },
    });
    if (!product) return null;
    const prices = latestPricePerMarket(product.prices);
    return { ...product, prices } as unknown as (typeof product & { quantityAmount: number | null; quantityUnit: string | null });
}

async function getCategoryPath(categoryId: string | null): Promise<{ id: string; name: string }[]> {
    if (!categoryId) return [];
    const all = await prisma.category.findMany({ select: { id: true, name: true, parentId: true } });
    const byId = new Map(all.map((c) => [c.id, c]));
    const path: { id: string; name: string }[] = [];
    let currentId: string | null = categoryId;
    const seen = new Set<string>();
    while (currentId && !seen.has(currentId)) {
        seen.add(currentId);
        const cat = byId.get(currentId);
        if (!cat) break;
        path.push({ id: cat.id, name: cat.name || 'Diğer' });
        currentId = cat.parentId;
    }
    return path.reverse();
}

import { calculateSimilarity } from '@/lib/matcher';
import { ProductSimilar } from '@/components/product-similar';
import { ProductImage } from '@/components/product-image';
import { ProductDetailActions } from '@/components/product-detail-actions';

async function getSimilarProducts(currentProduct: any) {
    // Vercel/serverless: Tüm ürünleri çekmek timeout ve bellek hatası verir; limit koyuyoruz.
    const allProducts = await prisma.product.findMany({
        where: {
            id: { not: currentProduct.id },
            prices: { some: {} },
        },
        include: {
            prices: {
                include: { market: true },
                orderBy: { date: 'desc' },
                take: 1,
            },
        },
        take: 200,
    });

    // 2. Calculate Similarity
    const matches = allProducts
        .map(p => {
            const score = calculateSimilarity(currentProduct.name, p.name);
            return {
                id: p.id,
                name: p.name,
                price: Number(p.prices[0]?.amount ?? 0),
                marketName: p.prices[0]?.market.name ?? 'Unknown',
                imageUrl: p.imageUrl || '',
                matchScore: score
            };
        })
        .filter(p => p.matchScore > 0.4 && p.price > 0) // Filter low matches
        .sort((a, b) => b.matchScore - a.matchScore) // Sort by similarity
        .slice(0, 3); // Take top 3


    return matches;
}

async function getCheaperAlternatives(currentProduct: any) {
    if (!currentProduct.categoryId || !currentProduct.quantityAmount) return [];

    const candidates = await prisma.product.findMany({
        where: {
            categoryId: currentProduct.categoryId,
            id: { not: currentProduct.id },
            prices: { some: {} }
        },
        include: {
            prices: {
                include: { market: true },
                orderBy: { date: 'desc' },
                take: 1
            }
        },
        take: 50 // Limit candidate pool
    });

    const currentPrice = currentProduct.prices[0]?.amount ? Number(currentProduct.prices[0].amount) : 0;
    const currentUnitPrice = (currentProduct.quantityAmount && currentProduct.quantityAmount > 0)
        ? currentPrice / currentProduct.quantityAmount
        : currentPrice; // adet fiyatı

    if (!currentPrice) return [];

    const alternatives = candidates.map(p => {
        const price = Number(p.prices[0]?.amount ?? 0);
        if (!price) return null;
        const unitPrice = (p.quantityAmount && p.quantityAmount > 0) ? price / p.quantityAmount : price;

        // Only include if it is CHEAPER per unit
        if (unitPrice >= currentUnitPrice) return null;

        return {
            id: p.id,
            name: p.name,
            price: price, // Total price
            unitPrice: unitPrice,
            marketName: p.prices[0]?.market?.name ?? 'Market',
            imageUrl: p.imageUrl || '',
            saving: ((currentUnitPrice - unitPrice) / currentUnitPrice) * 100 // Percentage cheaper
        };
    }).filter(p => p !== null);

    return alternatives.sort((a, b) => a!.unitPrice - b!.unitPrice).slice(0, 4);
}


export default async function ProductPage(props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const product = await getProduct(params.id);

        if (!product) {
            notFound();
        }

        // Fiyat yoksa (tarama/mapping sırasında veya yeni ürün) sayfayı yine göster, sadece fiyat alanını boş bırak
        const effectiveAmount = (p: { amount: unknown; campaignAmount?: unknown }) =>
            Number(p.campaignAmount ?? p.amount) || Number(p.amount);
        const sortedPrices = [...(product.prices || [])].sort((a, b) => effectiveAmount(a) - effectiveAmount(b));
        const bestPrice = sortedPrices[0]?.market ? sortedPrices[0] : null;
        const displayAmount = bestPrice ? (bestPrice.campaignAmount != null ? Number(bestPrice.campaignAmount) : Number(bestPrice.amount ?? 0)) : 0;
        const listAmount = bestPrice ? (bestPrice.amount != null ? Number(bestPrice.amount) : null) : null;
        const hasCampaign = bestPrice != null && bestPrice.campaignAmount != null && bestPrice.campaignCondition;

        // Unit Price: kampanya varsa kampanya fiyatına göre birim fiyat
        let unitPriceDisplay = null;
        const unit = (product.quantityUnit || '').toLowerCase();
        if (unit === 'adet' || unit === 'ad' || !product.quantityAmount || !product.quantityUnit) {
            unitPriceDisplay = `${displayAmount.toFixed(2)} ₺ / adet`;
        } else if (product.quantityAmount && product.quantityUnit) {
            const unitPrice = displayAmount / product.quantityAmount;
            const displayUnit = unit === 'l' || unit === 'lt' ? 'L' : (unit === 'kg' ? 'kg' : product.quantityUnit);
            unitPriceDisplay = `${unitPrice.toFixed(2)} ₺ / ${displayUnit}`;
        }

        // Kategori yolu, benzer ürünler ve alternatifler paralel; zaman aşımı ile sayfa takılmaz
        let similarProducts: Awaited<ReturnType<typeof getSimilarProducts>> = [];
        let categoryPath: { id: string; name: string }[] = [];
        let alternatives: Awaited<ReturnType<typeof getCheaperAlternatives>> = [];
        try {
            const race = Promise.race([
                Promise.all([
                    getCategoryPath(product.categoryId),
                    getSimilarProducts(product),
                    getCheaperAlternatives(product),
                ]),
                new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), PARALLEL_FETCH_TIMEOUT_MS)),
            ]);
            const [path, similar, alts] = await race;
            categoryPath = path;
            similarProducts = similar;
            alternatives = alts;
        } catch (_) {
            // Timeout veya DB hatası — sayfa yine gösterilir, benzer/alternatif boş kalır
        }

    // ... (imports)

    return (
        <div className="container mx-auto px-4 py-8">
            <NavigationButtons />
            <Card className="overflow-hidden">
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Image Section */}
                    <div className="bg-white p-8 flex items-center justify-center border-r border-gray-100 min-h-[400px]">
                        <div className="relative w-full aspect-square max-w-md">
                            <ProductImage
                                src={product.imageUrl}
                                alt={product.name}
                                className="object-contain w-full h-full"
                                priority
                            />
                        </div>
                    </div>

                    {/* Product Details Section */}
                    <div className="p-8 flex flex-col justify-center space-y-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                {categoryPath.length > 0 ? (
                                    categoryPath.map((node, i) => (
                                        <span key={node.id} className="flex items-center gap-2">
                                            {i > 0 && <span className="text-gray-400">/</span>}
                                            <Link
                                                href={`/?categoryId=${node.id}`}
                                                className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline uppercase tracking-wide"
                                            >
                                                {node.name}
                                            </Link>
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                                        {product.category || 'Kategorisiz'}
                                    </span>
                                )}
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
                            {bestPrice?.market && (
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                        {bestPrice.market.name}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-1">
                            {bestPrice ? (
                                <>
                                    <div className="text-4xl font-bold text-gray-900">
                                        {displayAmount.toFixed(2)} <span className="text-2xl text-gray-500 font-normal">₺</span>
                                        {hasCampaign && listAmount != null && listAmount !== displayAmount && (
                                            <span className="ml-2 text-lg font-normal text-gray-500 line-through">{listAmount.toFixed(2)} ₺</span>
                                        )}
                                    </div>
                                    {hasCampaign && bestPrice.campaignCondition && (
                                        <div className="text-sm text-amber-700 font-medium">
                                            {bestPrice.campaignCondition}: {displayAmount.toFixed(2)} ₺
                                        </div>
                                    )}
                                    {unitPriceDisplay && (
                                        <div className="text-sm text-gray-500 font-medium">
                                            Birim Fiyat: {unitPriceDisplay}
                                        </div>
                                    )}
                                    <p className="text-sm text-gray-500">
                                        Son Güncelleme: {bestPrice.date ? new Date(bestPrice.date).toLocaleDateString('tr-TR') : '—'}
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm text-gray-500">Fiyat bilgisi henüz yok.</p>
                            )}
                        </div>

                        <ProductDetailActions
                            productId={product.id}
                            categoryId={product.categoryId}
                            product={{
                                id: product.id,
                                name: product.name,
                                imageUrl: product.imageUrl,
                                price: displayAmount,
                                marketName: bestPrice?.market?.name ?? 'Market',
                            }}
                        />
                    </div>
                </div>
            </Card>


            <ProductSimilar currentProductId={product.id} products={similarProducts} />

            {/* Smart Alternatives Section */}
            {await (async () => {
                const alternatives = await getCheaperAlternatives(product);
                if (alternatives.length === 0) return null;

                return (
                    <div className="mt-12">
                        <h2 className="text-2xl font-bold mb-6 text-green-700 flex items-center gap-2">
                            <span>💸</span> Daha Uygun Alternatifler
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            {alternatives.map((alt: any) => (
                                <a href={`/product/${alt.id}`} key={alt.id} className="block group">
                                    <Card className="h-full hover:shadow-lg transition-shadow border-green-100 bg-green-50/30">
                                        <CardContent className="p-4">
                                            <div className="aspect-square relative mb-3 bg-white rounded-lg p-2">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <ProductImage
                                                    src={alt.imageUrl}
                                                    alt={alt.name}
                                                    className="w-full h-full object-contain"
                                                />
                                                <div className="absolute top-2 right-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                                                    %{Math.round(alt.saving)} Ucuz
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="text-xs text-green-700 font-semibold uppercase">{alt.marketName}</div>
                                                <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-green-700">
                                                    {alt.name}
                                                </h3>
                                                <div className="flex items-end justify-between">
                                                    <div className="text-lg font-bold text-gray-900">
                                                        {alt.price.toFixed(2)} ₺
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {alt.unitPrice.toFixed(2)} ₺/Birim
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </a>
                            ))}
                        </div>
                    </div>
                );
            })()}

        </div>
    );
    } catch (_) {
        notFound();
    }
}
