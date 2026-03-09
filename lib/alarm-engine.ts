
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Tek bir alarm için kontrol; alarm kurulunca anında çağrılır. */
export async function checkSingleAlarm(alarmId: string) {
    const alarm = await prisma.smartAlarm.findFirst({
        where: { id: alarmId, isActive: true },
        include: { category: true }
    });
    if (!alarm) return;
    await runAlarmCheck(alarm);
}

export async function checkAlarmsAfterScrape() {
    console.log('🔔 Checking Price Alarms...');
    const alarms = await prisma.smartAlarm.findMany({
        where: { isActive: true },
        include: { category: true }
    });
    for (const alarm of alarms) {
        await runAlarmCheck(alarm);
    }
}

async function runAlarmCheck(alarm: { id: string; name: string; categoryId: string; targetPrice: number; unitType: string; tags: string; includedProductIds: string; excludedProductIds: string; pendingProductIds: string | null; isAllProducts: boolean; userId: string }) {
    const tags = JSON.parse(alarm.tags) as string[];
        const includedIds = JSON.parse(alarm.includedProductIds) as string[];
        const excludedIds = JSON.parse(alarm.excludedProductIds) as string[];

        // Build product query
        const products = await prisma.product.findMany({
            where: {
                OR: [
                    { id: { in: includedIds } }, // Explicitly included
                    {
                        AND: [
                            { categoryId: alarm.categoryId },
                            { id: { notIn: excludedIds } }, // Not excluded
                            alarm.isAllProducts ? {} : { id: { in: includedIds } }
                        ]
                    }
                ]
            },
            include: {
                prices: {
                    orderBy: { date: 'desc' },
                    take: 1
                }
            }
        });

        for (const product of products) {
            const latestPrice = product.prices[0];
            if (!latestPrice) continue;

            const priceValue = Number(latestPrice.amount);
            const amount = product.quantityAmount || 1;
            const unitPrice = priceValue / amount;

            // Check if tags match (if alarm has tags)
            if (tags.length > 0) {
                const productTags = JSON.parse(product.tags || '[]') as string[];
                const hasMatchingTag = tags.some(tag => productTags.includes(tag));
                if (!hasMatchingTag && !includedIds.includes(product.id)) continue;
            }

            if (unitPrice <= alarm.targetPrice) {
                const productTags = JSON.parse(product.tags || '[]') as string[];
                const hasMatchingTag = tags.length === 0 || tags.some(tag => productTags.includes(tag));

                // Organik Takip Mantığı: Yeni ürün keşfi ve onay sırasına alma
                if (hasMatchingTag &&
                    !includedIds.includes(product.id) &&
                    !excludedIds.includes(product.id) &&
                    alarm.isAllProducts) {

                    const pendingIds = JSON.parse(alarm.pendingProductIds || '[]') as string[];
                    if (!pendingIds.includes(product.id)) {
                        console.log(`✨ NEW PRODUCT DISCOVERED FOR ALARM: ${alarm.name} -> ${product.name}`);
                        pendingIds.push(product.id);

                        await prisma.smartAlarm.update({
                            where: { id: alarm.id },
                            data: { pendingProductIds: JSON.stringify(pendingIds) }
                        });

                        // Create Notification for new product
                        await prisma.notification.create({
                            data: {
                                title: 'Yeni Ürün Keşfedildi',
                                message: `"${alarm.name}" alarmınız için uygun yeni bir ürün bulundu: ${product.name}`,
                                alarmId: alarm.id,
                                userId: alarm.userId // Alarm kime aitse bildirim de ona gider
                            }
                        });
                    }
                    continue; // Onay bekleyen ürün için hemen bildirim verme (isteğe bağlı)
                }

                // Normal Bildirim: Kullanıcı tarafından dahil edilmiş veya organik takibe onaylanmış ürünler
                if (includedIds.includes(product.id) || (alarm.isAllProducts && hasMatchingTag)) {
                    console.log(`🎯 ALARM TRIGGERED: ${alarm.name}`);
                    console.log(`   Product: ${product.name}`);
                    console.log(`   Target: ${alarm.targetPrice} | Current: ${unitPrice.toFixed(2)} (${alarm.unitType})`);

                    await prisma.smartAlarm.update({
                        where: { id: alarm.id },
                        data: { lastNotifiedAt: new Date() }
                    });

                    // Create Notification for price drop
                    await prisma.notification.create({
                        data: {
                            title: 'Fiyat Düştü! 🎯',
                            message: `${product.name} ürünü istediğiniz fiyatın altına düştü: ${unitPrice.toFixed(2)} ₺`,
                            alarmId: alarm.id,
                            userId: alarm.userId
                        }
                    });
                }
            }
        }
}
