
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const body = await request.json();
        const { isActive, targetPrice, name } = body;

        const updateData: any = {};
        if (isActive !== undefined) updateData.isActive = isActive;
        if (targetPrice !== undefined) updateData.targetPrice = parseFloat(targetPrice);
        if (name !== undefined) updateData.name = name;

        const resolvedParams = await params;
        const alarm = await prisma.smartAlarm.update({
            where: { id: resolvedParams.id },
            data: updateData
        });

        return NextResponse.json(alarm);
    } catch (error) {
        console.error('PATCH Alarm Error:', error);
        return NextResponse.json({ error: 'Failed to update alarm' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        await prisma.smartAlarm.delete({
            where: { id: resolvedParams.id }
        });

        return NextResponse.json({ message: 'Alarm deleted' });
    } catch (error) {
        console.error('DELETE Alarm Error:', error);
        return NextResponse.json({ error: 'Failed to delete alarm' }, { status: 500 });
    }
}
