
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const notifications = await prisma.notification.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        return NextResponse.json(notifications);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const { ids } = await req.json();
        await prisma.notification.updateMany({
            where: { id: { in: ids } },
            data: { isRead: true }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
    }
}
