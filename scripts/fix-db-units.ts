
import { PrismaClient } from '@prisma/client';
import { parseUnit } from '../lib/unit-parser';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting unit price fix...");
    const products = await prisma.product.findMany();
    console.log(`Found ${products.length} products.`);

    let validCount = 0;
    let updatedCount = 0;

    for (const p of products) {
        const parsed = parseUnit(p.name);
        if (parsed) {
            // Check if update corresponds to new logic
            // e.g. if we had null, or different value
            // To be safe, just update if parsed is valid
            // Optimization: check if difference exists
            const eps = 0.0001;
            const amountChanged = !p.quantityAmount || Math.abs(p.quantityAmount - parsed.amount) > eps;
            const unitChanged = p.quantityUnit !== parsed.unit;

            if (amountChanged || unitChanged) {
                await prisma.product.update({
                    where: { id: p.id },
                    data: {
                        quantityAmount: parsed.amount,
                        quantityUnit: parsed.unit
                    }
                });
                // console.log(`Updated ${p.name}: ${p.quantityAmount} ${p.quantityUnit} -> ${parsed.amount} ${parsed.unit}`);
                updatedCount++;
            }
            validCount++;
        }
    }

    console.log(`Process Complete.`);
    console.log(`Total Products: ${products.length}`);
    console.log(`Parsable: ${validCount}`);
    console.log(`Updated: ${updatedCount}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
