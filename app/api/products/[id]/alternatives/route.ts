
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // Next.js 15+ params are async
) {
    try {
        const { id } = await params;

        // 1. Get the reference product
        const product = await prisma.product.findUnique({
            where: { id },
            include: { prices: { orderBy: { date: 'desc' }, take: 1 } }
        });

        if (!product || !product.categoryId) {
            return NextResponse.json({ alternatives: [] });
        }

        // 2. Find alternatives in the same category
        // We want the CHEAPEST unit price.
        // Prisma doesn't support computed sorting easily, so we might need to fetch candidates and sort in JS
        // or use raw query. For now, fetch top 50 candidates and sort in JS.


        const candidates = await prisma.product.findMany({
            where: {
                categoryId: product.categoryId,
                id: { not: id }, // Exclude self
                // prices: { some: {} } // Must have a price (already implied by logic below, but good for perf if supported)
            },
            include: {
                prices: {
                    orderBy: { date: 'desc' },
                    take: 1
                },
                // masterCategory: true // Not needed if we just return product details
            },
            take: 100
        });

        // 3. Calculate Unit Prices and Sort
        // Type definition for enhanced product
        type ProductWithUnit = typeof candidates[0] & {
            currentPrice: number;
            unitPrice: number;
        };

        const withUnitPrice: ProductWithUnit[] = candidates.map(p => {
            const priceDecimal = p.prices[0]?.amount;
            if (!priceDecimal) return null;

            const price = Number(priceDecimal);

            // Unit price calculation logic
            // If quantityAmount is present, likely reliable (e.g. 1.5).
            // If not, we might fail or default to 1 (risky).
            // For now, only compare if quantityAmount exists.
            if (!p.quantityAmount) return null;

            const unitPrice = price / p.quantityAmount;

            return {
                ...p,
                currentPrice: price,
                unitPrice
            };
        }).filter((p): p is ProductWithUnit => p !== null);

        // Sort by unit price ASC
        withUnitPrice.sort((a, b) => a.unitPrice - b.unitPrice);

        // Take top 4 cheapest
        const alternatives = withUnitPrice.slice(0, 4);

        return NextResponse.json({ alternatives });


    } catch (error) {
        console.error("Error fetching alternatives:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
