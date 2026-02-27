
'use server'

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function getSmartAlarms() {
    try {
        const alarms = await prisma.smartAlarm.findMany({
            include: {
                category: true,
            },
            orderBy: {
                createdAt: 'desc',
            }
        });
        return alarms;
    } catch (error) {
        console.error('Failed to fetch alarms:', error);
        return [];
    }
}

export async function deleteSmartAlarm(id: string) {
    try {
        await prisma.smartAlarm.delete({
            where: { id }
        });
        revalidatePath('/smart-alarm');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete alarm:', error);
        return { success: false, error: 'Failed to delete alarm' };
    }
}

// Support both direct form action and useFormState
export async function createSmartAlarm(prevStateOrFormData: any, formDataOrUndefined?: FormData) {
    // Determine which argument holds the FormData
    const formData = (prevStateOrFormData instanceof FormData) ? prevStateOrFormData : formDataOrUndefined;

    if (!formData) {
        return { success: false, error: 'No form data provided' };
    }

    const name = formData.get('name') as string;
    const categoryId = formData.get('categoryId') as string;
    const targetPrice = parseFloat(formData.get('targetPrice') as string);
    const tags = formData.get('tags') as string || '[]';
    const excludedProductIds = formData.get('excludedProductIds') as string || '[]';

    if (!categoryId || !targetPrice) {
        return { success: false, error: 'Missing required fields' };
    }

    try {
        // Fetch category name for default alarm name
        const category = await prisma.category.findUnique({ where: { id: categoryId } });
        const finalName = name || category?.name || 'Yeni Alarm';

        await prisma.smartAlarm.create({
            data: {
                name: finalName,
                categoryId,
                targetPrice,
                tags,
                excludedProductIds,
                isActive: true
            }
        });

        revalidatePath('/smart-alarm');
    } catch (error) {
        console.error('Failed to create alarm:', error);
        return { success: false, error: 'Failed to create alarm' };
    }

    redirect('/smart-alarm');
}

export async function excludeProductFromAlarm(alarmId: string, productId: string) {
    try {
        const alarm = await prisma.smartAlarm.findUnique({ where: { id: alarmId } });
        if (!alarm) return { success: false };

        const currentExclusions = JSON.parse(alarm.excludedProductIds) as string[];
        if (!currentExclusions.includes(productId)) {
            const newExclusions = [...currentExclusions, productId];
            await prisma.smartAlarm.update({
                where: { id: alarmId },
                data: { excludedProductIds: JSON.stringify(newExclusions) }
            });
            revalidatePath('/smart-alarm');
        }
        return { success: true };
    } catch (error) {
        console.error('Failed to exclude product:', error);
        return { success: false, error: 'Failed' };
    }
}

function calculateUnitPrice(price: number, amount: number | null, unit: string | null): number {
    if (!amount || !unit) return price; // Fallback to package price if no unit info

    const normalizedUnit = unit.toLowerCase().trim();
    let multiplier = 1;

    // Convert everything to Reference Unit (kg, l, adet)
    if (normalizedUnit === 'g' || normalizedUnit === 'gr' || normalizedUnit === 'gram') {
        multiplier = 0.001; // 1000g = 1kg
    } else if (normalizedUnit === 'ml' || normalizedUnit === 'mililitre') {
        multiplier = 0.001; // 1000ml = 1l
    } else if (normalizedUnit === 'kg' || normalizedUnit === 'l' || normalizedUnit === 'litre' || normalizedUnit === 'lt' || normalizedUnit === 'ad' || normalizedUnit === 'adet') {
        multiplier = 1;
    } else {
        // Unknown unit, treat as package
        return price;
    }

    const totalQuantity = amount * multiplier;
    if (totalQuantity === 0) return price;

    return price / totalQuantity;
}

export async function getAlarmMatches(alarmId: string) {
    const alarm = await prisma.smartAlarm.findUnique({
        where: { id: alarmId },
        include: { category: true }
    });

    if (!alarm) return [];

    const tags = JSON.parse(alarm.tags) as string[];
    const excludedIds = JSON.parse(alarm.excludedProductIds) as string[];

    // 1. Fetch potential candidates (Category + Not Excluded)
    // We CANNOT filter by calculated unit price at DB level efficiently without a computed column.
    // So we fetch broader candidates and filter in memory.
    // Optimization: Filter roughly by price first? No, 60g gives small price.
    // Just fetch category products.

    // Build Where Clause
    const where: any = {
        categoryId: alarm.categoryId,
        id: { notIn: excludedIds },
        prices: { some: {} } // Ensure it has at least one price
    };

    // Apply Keyword Filters for Tags (Heuristic)
    if (tags.length > 0) {
        where.AND = tags.map(tag => ({
            name: { contains: tag }
        }));
    }

    const potentialMatches = await prisma.product.findMany({
        where,
        include: {
            prices: {
                orderBy: { date: 'desc' },
                take: 1,
                include: { market: true }
            }
        },
        take: 200 // Analyze top 200 items in category
    });

    // 2. Filter by Unit Price in Memory
    const matches = potentialMatches.filter(product => {
        const latestPrice = product.prices[0];
        if (!latestPrice) return false;

        const unitPrice = calculateUnitPrice(
            Number(latestPrice.amount),
            product.quantityAmount,
            product.quantityUnit
        );

        // Target Price is interpreted as Unit Price Limit (e.g. 300 TL/kg)
        return unitPrice <= alarm.targetPrice;
    });

    return matches.slice(0, 50); // Return top 50 valid matches
}
