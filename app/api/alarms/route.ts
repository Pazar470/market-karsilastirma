import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkSingleAlarm } from '@/lib/alarm-engine';
import { requireUserSession } from '@/lib/user-session';

export async function GET() {
    const session = await requireUserSession();
    if (session instanceof Response) return session;
    try {
        const alarms = await prisma.smartAlarm.findMany({
            where: { userId: session.userId },
            include: { category: true },
            orderBy: { createdAt: 'desc' },
        });
        const formattedAlarms = alarms.map((alarm) => ({
            ...alarm,
            tags: JSON.parse(alarm.tags || '[]'),
            includedProductIds: JSON.parse(alarm.includedProductIds || '[]'),
            excludedProductIds: JSON.parse(alarm.excludedProductIds || '[]'),
            pendingProductIds: JSON.parse(alarm.pendingProductIds || '[]'),
        }));
        return NextResponse.json(formattedAlarms);
    } catch (error) {
        console.error('GET Alarms Error:', error);
        return NextResponse.json({ error: 'Failed to fetch alarms' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await requireUserSession();
    if (session instanceof Response) return session;
    try {
        const body = await request.json();
        const {
            name,
            categoryId,
            targetPrice,
            unitType,
            tags,
            includedProductIds,
            excludedProductIds,
            isAllProducts,
        } = body;

        if (!name || !categoryId || !targetPrice) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const price = parseFloat(String(targetPrice).replace(',', '.'));
        if (Number.isNaN(price) || price < 0) {
            return NextResponse.json({ error: 'Geçersiz hedef fiyat' }, { status: 400 });
        }

        const alarm = await prisma.smartAlarm.create({
            data: {
                name,
                categoryId,
                targetPrice: price,
                unitType: unitType || 'KG',
                tags: JSON.stringify(tags || []),
                includedProductIds: JSON.stringify(includedProductIds || []),
                excludedProductIds: JSON.stringify(excludedProductIds || []),
                isAllProducts: isAllProducts !== undefined ? isAllProducts : true,
                userId: session.userId,
            },
        });

        try {
            await checkSingleAlarm(alarm.id);
        } catch (e) {
            console.warn('Alarm anında kontrol hatası (alarm yine kaydedildi):', e);
        }

        return NextResponse.json(alarm);
    } catch (error) {
        console.error('POST Alarm Error:', error);
        return NextResponse.json({ error: 'Failed to create alarm' }, { status: 500 });
    }
}
