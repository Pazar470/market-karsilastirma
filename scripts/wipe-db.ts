
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function wipeDatabase() {
    console.log('☢️  NUCLEAR WIPE INITIATED ☢️');

    // Deletion Order Matters due to Foreign Keys
    // 1. Price (Depends on Product, Market)
    console.log('1. Deleting Prices...');
    await prisma.price.deleteMany({});

    // 2. Product (Depends on Category, Market? No, Market is on Price. Category is optional relation or string)
    // Actually Product has `categoryId` FK to Category.
    console.log('2. Deleting Products...');
    await prisma.product.deleteMany({});

    // 3. SmartAlarm (Depends on Category)
    console.log('3. Deleting SmartAlarms...');
    await prisma.smartAlarm.deleteMany({});

    // 4. Category (Parent of Product, SmartAlarm, and itself via children)
    console.log('4. Deleting Categories...');
    await prisma.category.deleteMany({});

    // 5. Market (Parent of Price)
    console.log('5. Deleting Markets...');
    await prisma.market.deleteMany({});

    console.log('✅ Database is now EMPTY.');
}

wipeDatabase()
    .catch(e => {
        console.error('Error wiping DB:', e);
    })
    .finally(() => prisma.$disconnect());
