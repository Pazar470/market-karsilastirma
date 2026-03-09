import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUserSession } from '@/lib/user-session';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await requireUserSession();
    if (session instanceof Response) return session;
    try {
        const resolvedParams = await params;
        const alarm = await prisma.smartAlarm.findFirst({
            where: { id: resolvedParams.id, userId: session.userId },
            include: { category: true },
        });
        if (!alarm) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        const tags = JSON.parse(alarm.tags || '[]');
        const includedProductIds = JSON.parse(alarm.includedProductIds || '[]');
        const excludedProductIds = JSON.parse(alarm.excludedProductIds || '[]');
        const pendingProductIds = JSON.parse(alarm.pendingProductIds || '[]');
        return NextResponse.json({
            ...alarm,
            tags: Array.isArray(tags) ? tags : [],
            includedProductIds: Array.isArray(includedProductIds) ? includedProductIds : [],
            excludedProductIds: Array.isArray(excludedProductIds) ? excludedProductIds : [],
            pendingProductIds: Array.isArray(pendingProductIds) ? pendingProductIds : [],
        });
    } catch (error) {
        console.error('GET Alarm Error:', error);
        return NextResponse.json({ error: 'Failed to fetch alarm' }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await requireUserSession();
    if (session instanceof Response) return session;
    try {
        const resolvedParams = await params;
        const existing = await prisma.smartAlarm.findFirst({
            where: { id: resolvedParams.id, userId: session.userId },
        });
        if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const body = await request.json();
        const {
            isActive,
            targetPrice,
            name,
            tags,
            includedProductIds,
            excludedProductIds,
            pendingProductIds,
            isAllProducts,
        } = body;

        const updateData: Record<string, unknown> = {};
        if (isActive !== undefined) updateData.isActive = isActive;
        if (targetPrice !== undefined) updateData.targetPrice = parseFloat(targetPrice);
        if (name !== undefined) updateData.name = name;
        if (tags !== undefined) updateData.tags = typeof tags === 'string' ? tags : JSON.stringify(tags || []);
        if (includedProductIds !== undefined) updateData.includedProductIds = typeof includedProductIds === 'string' ? includedProductIds : JSON.stringify(includedProductIds || []);
        if (excludedProductIds !== undefined) updateData.excludedProductIds = typeof excludedProductIds === 'string' ? excludedProductIds : JSON.stringify(excludedProductIds || []);
        if (pendingProductIds !== undefined) updateData.pendingProductIds = typeof pendingProductIds === 'string' ? pendingProductIds : JSON.stringify(pendingProductIds || []);
        if (isAllProducts !== undefined) updateData.isAllProducts = Boolean(isAllProducts);

        const alarm = await prisma.smartAlarm.update({
            where: { id: resolvedParams.id },
            data: updateData,
        });
        return NextResponse.json(alarm);
    } catch (error) {
        console.error('PATCH Alarm Error:', error);
        return NextResponse.json({ error: 'Failed to update alarm' }, { status: 500 });
    }
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await requireUserSession();
    if (session instanceof Response) return session;
    try {
        const resolvedParams = await params;
        const existing = await prisma.smartAlarm.findFirst({
            where: { id: resolvedParams.id, userId: session.userId },
        });
        if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        await prisma.smartAlarm.delete({
            where: { id: resolvedParams.id },
        });
        return NextResponse.json({ message: 'Alarm deleted' });
    } catch (error) {
        console.error('DELETE Alarm Error:', error);
        return NextResponse.json({ error: 'Failed to delete alarm' }, { status: 500 });
    }
}
