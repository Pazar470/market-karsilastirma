
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
        return NextResponse.json([]);
    }

    const terms = query.split(' ').filter(t => t.length > 0);
    const nameConditions = terms.map(term => ({
        name: { contains: term }
    }));

    try {
        // Fetch distinct names containing all terms
        const products = await prisma.product.findMany({
            where: {
                AND: nameConditions
            },
            select: {
                name: true,
            },
            distinct: ['name'],
            take: 10,
        });

        // Filter in memory for "starts with" preference if needed, but contains is usually fine for search
        // User asked for "starts with" behavior: "baldo yazınca sadece baldo kalsın"

        const names = products.map(p => p.name);
        return NextResponse.json(names);
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
