
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupSokPricesSafe() {
    console.log('Starting SAFER cleanup of erroneous Sok prices...');

    try {
        const market = await prisma.market.findFirst({
            where: { name: 'Şok' }
        });

        if (!market) {
            console.log('Şok market not found.');
            return;
        }

        // Limit: items > 3000 TL
        const threshold = 3000;

        const candidatePrices = await prisma.price.findMany({
            where: {
                marketId: market.id,
                amount: { gt: threshold }
            },
            include: {
                product: true
            }
        });

        console.log(`Found ${candidatePrices.length} prices above ${threshold} TL.`);

        const pricesToDelete: string[] = [];
        const productsToDeleteIds: string[] = [];

        for (const price of candidatePrices) {
            const product = price.product;
            if (!product) continue;

            const nameLower = product.name.toLowerCase();
            const catLower = (product.category || '').toLowerCase();

            // SAFEGUARDS: Do NOT delete if it looks like electronics
            const isElectronic =
                catLower.includes('elektronik') ||
                catLower.includes('telefon') ||
                catLower.includes('bilgisayar') ||
                nameLower.includes('tv') ||
                nameLower.includes('televizyon') ||
                nameLower.includes('iphone') ||
                nameLower.includes('samsung') && (nameLower.includes('galaxy') || nameLower.includes('note')) ||
                nameLower.includes('laptop') ||
                nameLower.includes('notebook') ||
                nameLower.includes('tablet') ||
                nameLower.includes('playstation') ||
                nameLower.includes('xbox') ||
                nameLower.includes('dyson') ||
                nameLower.includes('airfryer');

            if (isElectronic) {
                console.log(`SKIPPING (Electronic): ${product.name} - ${price.amount} TL`);
                continue;
            }

            // Also skip if name suggests bulk (e.g. 50 kg) and price is somewhat reasonable
            // But typical errors were 42000 for cheese.
            // Let's print what we are deleting.
            console.log(`DELETING CANDIDATE: ${product.name} - ${price.amount} TL (Category: ${product.category})`);
            pricesToDelete.push(price.id);
            productsToDeleteIds.push(product.id);
        }

        if (pricesToDelete.length > 0) {
            console.log(`Deleting ${pricesToDelete.length} bad prices...`);
            await prisma.price.deleteMany({
                where: {
                    id: { in: pricesToDelete }
                }
            });

            // Cleanup orphan products (only if they have no other prices)
            // This is complex. For now, let's just delete the prices.
            console.log('Prices deleted.');
        } else {
            console.log('No bad prices found to delete.');
        }

    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanupSokPricesSafe();
