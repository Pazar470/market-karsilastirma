/**
 * Supabase'e geçiş sonrası: Ürün + Fiyat siler, Market kayıtlarını oluşturur.
 * Çalıştırma: npx tsx scripts/clear-and-seed-for-scan.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MARKETS = [
    { name: 'Migros', url: 'https://www.migros.com.tr' },
    { name: 'A101', url: 'https://www.a101.com.tr' },
    { name: 'Sok', url: 'https://www.sokmarket.com.tr' },
] as const;

async function main() {
    console.log('🗑️ Price ve Product siliniyor...');
    const deletedPrices = await prisma.price.deleteMany({});
    const deletedProducts = await prisma.product.deleteMany({});
    console.log('   Price:', deletedPrices.count, ', Product:', deletedProducts.count);

    console.log('📌 Market kayıtları (Migros, A101, Sok)...');
    for (const m of MARKETS) {
        await prisma.market.upsert({
            where: { name: m.name },
            update: { url: m.url },
            create: { name: m.name, url: m.url },
        });
    }
    console.log('   Tamamlandı.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
