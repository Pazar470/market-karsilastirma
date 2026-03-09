import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUserSession } from '@/lib/user-session';

export async function GET() {
    const session = await requireUserSession();
    if (session instanceof Response) return session;
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: session.userId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        return NextResponse.json(notifications);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const session = await requireUserSession();
    if (session instanceof Response) return session;
    try {
        const { ids } = await req.json();
        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ success: true });
        }
        await prisma.notification.updateMany({
            where: { id: { in: ids }, userId: session.userId },
            data: { isRead: true },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
    }
}
