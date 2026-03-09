
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

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

        return NextResponse.json(categories);
    } catch (error) {
        console.error('GET Categories Error:', error);
        return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }
}
