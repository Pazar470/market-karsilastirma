
import { prisma } from '../lib/db';

async function checkMarkets() {
    const markets = await prisma.market.findMany();
    console.log('Markets:', markets);
}

checkMarkets().finally(() => prisma.$disconnect());
