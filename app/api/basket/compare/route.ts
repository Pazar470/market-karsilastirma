import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface BasketItemRequest {
    productId: string;
    quantity: number;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { items } = body as { items: BasketItemRequest[] };

        if (!items || items.length === 0) {
            return NextResponse.json({ markets: [] });
        }

        // 1. Get source products to know what we are looking for
        const sourceProducts = await prisma.product.findMany({
            where: {
                id: { in: items.map(i => i.productId) }
            },
            include: {
                prices: {
                    include: { market: true },
                    orderBy: { date: 'desc' },
                    take: 1
                }
            }
        });

        // 2. Find matches for each product
        // We will build a map of SourceProductId -> [MatchedProducts]
        const productMatches = new Map<string, any[]>();

        for (const sourceProduct of sourceProducts) {
            // Search criteria: Same Barcode OR Similar Name
            // Simple approach: Exact name match or contains
            // Ideally should use full text search or fuzzy matching

            // For this POC, we'll try to find products that contain the significant parts of the name
            // e.g. "Sütaş Ayran 1L" -> search "Sütaş Ayran"

            // Removing units/numbers might help for broader match
            // const simpleName = sourceProduct.name.replace(/\d+(gb|mb|kg|g|l|ml|li|lu)/gi, '').trim(); 

            const whereClause: any = {
                OR: [
                    { name: { contains: sourceProduct.name } }, // Simple contains
                    { name: { equals: sourceProduct.name } }
                ],
                NOT: { id: sourceProduct.id } // Exclude self
            };

            if (sourceProduct.barcode) {
                whereClause.OR.push({ barcode: sourceProduct.barcode });
            }

            const matches = await prisma.product.findMany({
                where: whereClause,
                include: {
                    prices: {
                        include: { market: true },
                        orderBy: { date: 'desc' },
                        take: 1
                    }
                }
            });

            // Add self to matches to handle the market where it came from
            productMatches.set(sourceProduct.id, [sourceProduct, ...matches]);
        }

        // 3. Group by Market
        // We want to see: For Market X, what is the total?
        const marketTotals = new Map<string, {
            marketName: string,
            totalPrice: number,
            foundItems: number,
            missingItems: string[]
        }>();

        // Initialize markets (Hardcoded or fetched)
        const allMarkets = ['A101', 'Şok', 'BİM', 'Migros'];
        // Or better, derive from matches
        const marketsSet = new Set<string>();
        productMatches.forEach(matches => {
            matches.forEach(p => {
                const marketName = p.prices[0]?.market?.name;
                if (marketName) marketsSet.add(marketName);
            });
        });

        marketsSet.forEach(marketName => {
            marketTotals.set(marketName, {
                marketName,
                totalPrice: 0,
                foundItems: 0,
                missingItems: []
            });
        });

        // 4. Calculate Totals
        for (const item of items) {
            const sourceProductId = item.productId;
            const matches = productMatches.get(sourceProductId) || [];
            const sourceProductInfo = sourceProducts.find(p => p.id === sourceProductId);

            if (!sourceProductInfo) continue;

            marketsSet.forEach(marketName => {
                const marketEntry = marketTotals.get(marketName)!;

                // Find best price for this product in this market
                // We look through all 'matches' to see if any belongs to this market
                const matchInMarket = matches.find(p =>
                    p.prices.length > 0 &&
                    p.prices[0].market.name === marketName
                );

                if (matchInMarket) {
                    const price = Number(matchInMarket.prices[0].amount);
                    marketEntry.totalPrice += price * item.quantity;
                    marketEntry.foundItems += 1;
                } else {
                    marketEntry.missingItems.push(sourceProductInfo.name);
                }
            });
        }

        // 5. Build Item Details for Frontend (Alternatives)
        const itemDetails = items.map(item => {
            const sourceProductId = item.productId;
            const matches = productMatches.get(sourceProductId) || [];

            const alternatives = marketsSet.size > 0 ? Array.from(marketsSet).map(marketName => {
                const matchInMarket = matches.find(p =>
                    p.prices.length > 0 &&
                    p.prices[0].market.name === marketName
                );

                if (matchInMarket && matchInMarket.id !== sourceProductId) {
                    return {
                        marketName,
                        productName: matchInMarket.name,
                        price: Number(matchInMarket.prices[0].amount),
                        productId: matchInMarket.id,
                        imageUrl: matchInMarket.imageUrl
                    };
                }
                return null;
            }).filter(Boolean) : [];

            return {
                sourceProductId,
                alternatives
            };
        });

        // Convert to array and sort
        const results = Array.from(marketTotals.values())
            .sort((a, b) => a.totalPrice - b.totalPrice);

        return NextResponse.json({
            markets: results,
            itemDetails,
            sourceProductCount: items.length
        });

    } catch (error) {
        console.error('Basket comparison error:', error);
        return NextResponse.json({ error: 'Failed to compare basket' }, { status: 500 });
    }
}
