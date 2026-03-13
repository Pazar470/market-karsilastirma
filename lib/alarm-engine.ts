import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/** Tek bir alarm için kontrol; alarm kurulunca anında çağrılır. */
export async function checkSingleAlarm(alarmId: string) {
    const alarm = await prisma.smartAlarm.findFirst({
        where: { id: alarmId, isActive: true },
        include: { category: true }
    });
    if (!alarm) return;
    await runAlarmCheck(alarm as AlarmRow);
}

export async function checkAlarmsAfterScrape() {
    console.log('🔔 Checking Price Alarms...');
    const alarms = await prisma.smartAlarm.findMany({
        where: { isActive: true },
        include: { category: true }
    });
    for (const alarm of alarms) {
        await runAlarmCheck(alarm as AlarmRow);
    }
}

type AlarmRow = {
    id: string; name: string; categoryId: string | null; categoryIds: string; targetPrice: number; unitType: string;
    tags: string; includedProductIds: string; excludedProductIds: string; pendingProductIds: string | null;
    isAllProducts: boolean; userId: string;
};

function getEffectiveCategoryIds(alarm: AlarmRow): string[] {
    const ids = JSON.parse(alarm.categoryIds || '[]') as string[];
    if (ids.length > 0) return ids;
    if (alarm.categoryId) return [alarm.categoryId];
    return [];
}

async function runAlarmCheck(alarm: AlarmRow) {
    const tags = JSON.parse(alarm.tags) as string[];
    const includedIds = JSON.parse(alarm.includedProductIds) as string[];
    const excludedIds = JSON.parse(alarm.excludedProductIds) as string[];
    const categoryIds = getEffectiveCategoryIds(alarm);

    // Ürün sorgusu: dahil edilenler + (kategori varsa o kategorilerdeki ürünler)
    const orConditions: Prisma.ProductWhereInput[] = [];
    if (includedIds.length > 0) orConditions.push({ id: { in: includedIds } });
    if (categoryIds.length > 0) {
        orConditions.push({
            AND: [
                { categoryId: { in: categoryIds } },
                { id: { notIn: excludedIds } },
                alarm.isAllProducts ? {} : { id: { in: includedIds } },
            ],
        });
    }
    const productWhere: Prisma.ProductWhereInput = orConditions.length > 0
        ? { OR: orConditions }
        : { id: { in: [] } }; // Kategori ve dahil ürün yoksa hiç ürün getirme

    const products = await prisma.product.findMany({
        where: productWhere,
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

                        // Create Notification for new product (JSON payload içinde ürün özeti ile)
                        const notificationPayload = {
                            text: `"${alarm.name}" alarmınız için koşulları karşılayan yeni bir ürün bulundu.`,
                            product: {
                                id: product.id,
                                name: product.name,
                                imageUrl: product.imageUrl,
                                price: priceValue,
                                quantityAmount: product.quantityAmount,
                                quantityUnit: product.quantityUnit,
                                marketName: undefined as string | undefined,
                            },
                        };

                        await prisma.notification.create({
                            data: {
                                title: 'Yeni Ürün Keşfedildi',
                                message: JSON.stringify(notificationPayload),
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
                    const notificationPayload = {
                        text: `${product.name} ürünü istediğiniz hedef birim fiyatın altına düştü: ${unitPrice.toFixed(2)} ₺/${alarm.unitType}.`,
                        product: {
                            id: product.id,
                            name: product.name,
                            imageUrl: product.imageUrl,
                            price: priceValue,
                            quantityAmount: product.quantityAmount,
                            quantityUnit: product.quantityUnit,
                            marketName: undefined as string | undefined,
                        },
                    };

                    await prisma.notification.create({
                        data: {
                            title: 'Fiyat Düştü! 🎯',
                            message: JSON.stringify(notificationPayload),
                            alarmId: alarm.id,
                            userId: alarm.userId
                        }
                    });
                }
            }
        }
}
