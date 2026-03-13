import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUserSession } from '@/lib/user-session';

/** Alarmdaki kategorilerde olup alarmda (sağlayan/bekleyen/gizlenen) olmayan ürünler — "gerçekten yeni" ürünler. */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await requireUserSession();
    if (session instanceof Response) return session;
    try {
        const { id } = await params;
        const alarm = await prisma.smartAlarm.findFirst({
            where: { id, userId: session.userId },
            select: {
                name: true,
                categoryIds: true,
                categoryId: true,
                includedProductIds: true,
                excludedProductIds: true,
                pendingProductIds: true,
            },
        });
        if (!alarm) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const categoryIds = (JSON.parse(alarm.categoryIds || '[]') as string[]) || (alarm.categoryId ? [alarm.categoryId] : []);
        if (categoryIds.length === 0) {
            return NextResponse.json({ products: [], categoryNames: [] });
        }

        const included = JSON.parse(alarm.includedProductIds || '[]') as string[];
        const excluded = JSON.parse(alarm.excludedProductIds || '[]') as string[];
        const pending = JSON.parse(alarm.pendingProductIds || '[]') as string[];
        const alreadyInAlarm = new Set([...included, ...excluded, ...pending]);

        const priceMinDate = new Date();
        priceMinDate.setDate(priceMinDate.getDate() - 1);

        const categories = await prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true },
        });
        const categoryNames = categories.map((c) => c.name);

        const products = await prisma.product.findMany({
            where: {
                categoryId: { in: categoryIds },
                id: { notIn: Array.from(alreadyInAlarm) },
                prices: { some: { date: { gte: priceMinDate } } },
                isSuspicious: false,
            },
            include: {
                prices: {
                    include: { market: true },
                    orderBy: { date: 'desc' },
                    take: 10,
                },
                masterCategory: true,
            },
            take: 100,
        });

        return NextResponse.json({
            products,
            categoryNames,
            alarmName: alarm.name,
        });
    } catch (error) {
        console.error('GET new-products Error:', error);
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }
}
