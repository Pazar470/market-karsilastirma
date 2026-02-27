
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const alarms = await prisma.smartAlarm.findMany({
            include: {
                category: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Parse JSON strings back to arrays
        const formattedAlarms = alarms.map(alarm => ({
            ...alarm,
            tags: JSON.parse(alarm.tags),
            includedProductIds: JSON.parse(alarm.includedProductIds),
            excludedProductIds: JSON.parse(alarm.excludedProductIds)
        }));

        return NextResponse.json(formattedAlarms);
    } catch (error) {
        console.error('GET Alarms Error:', error);
        return NextResponse.json({ error: 'Failed to fetch alarms' }, { status: 500 });
    }
}

export async function POST(request: Request) {
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
            isAllProducts
        } = body;

        if (!name || !categoryId || !targetPrice) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const alarm = await prisma.smartAlarm.create({
            data: {
                name,
                categoryId,
                targetPrice: parseFloat(targetPrice),
                unitType: unitType || 'KG',
                tags: JSON.stringify(tags || []),
                includedProductIds: JSON.stringify(includedProductIds || []),
                excludedProductIds: JSON.stringify(excludedProductIds || []),
                isAllProducts: isAllProducts !== undefined ? isAllProducts : true,
                userId: 'beta-user-1' // Geçici dummy user ID, asıl auth gelene kadar
            }
        });

        return NextResponse.json(alarm);
    } catch (error) {
        console.error('POST Alarm Error:', error);
        return NextResponse.json({ error: 'Failed to create alarm' }, { status: 500 });
    }
}
