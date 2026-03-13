import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const leafOnly = searchParams.get('leafOnly') === 'true';

    try {
        const categories = await prisma.category.findMany({
            where: leafOnly ? {
                children: { none: {} } // Leaf nodes have no children
            } : {},
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(categories, {
            headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate' },
        });
    } catch (error) {
        console.error('GET Categories Error:', error);
        return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }
}
