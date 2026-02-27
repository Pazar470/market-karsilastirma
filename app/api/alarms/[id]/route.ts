
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { isActive, targetPrice, name } = body;

        const updateData: any = {};
        if (isActive !== undefined) updateData.isActive = isActive;
        if (targetPrice !== undefined) updateData.targetPrice = parseFloat(targetPrice);
        if (name !== undefined) updateData.name = name;

        const alarm = await prisma.smartAlarm.update({
            where: { id: params.id },
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
    { params }: { params: { id: string } }
) {
    try {
        await prisma.smartAlarm.delete({
            where: { id: params.id }
        });

        return NextResponse.json({ message: 'Alarm deleted' });
    } catch (error) {
        console.error('DELETE Alarm Error:', error);
        return NextResponse.json({ error: 'Failed to delete alarm' }, { status: 500 });
    }
}
