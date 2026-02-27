
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Diagnosing Migros 'Domates' products...");

    // Find all Migros products matching "domates"
    const products = await prisma.product.findMany({
        where: {
            name: { contains: 'domates' },
            prices: {
                some: {
                    market: { name: 'Migros' }
                }
            }
        },
        include: {
            masterCategory: true,
            prices: {
                include: { market: true }
            }
        }
    });

    console.log(`Found ${products.length} Migros products matching 'domates'.`);

    products.forEach(p => {
        console.log(`- [${p.name}]`);
        console.log(`  Market Category: ${p.category}`);
        console.log(`  Master Category: ${p.masterCategory?.name || 'NULL'}`);
        console.log('---');
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
