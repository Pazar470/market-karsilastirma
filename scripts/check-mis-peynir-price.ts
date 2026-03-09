/**
 * "Mis Yarım Yağlı Taze Beyaz Peynir 450 g" ürününün fiyat kaydını kontrol eder.
 * 105 TL nereden gelmiş (kategori kodu mu, liste sayfasındaki yanlış parse mı) bakıyoruz.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const urun = await prisma.product.findFirst({
        where: { name: { contains: 'Mis Yarım Yağlı Taze Beyaz Peynir 450' } },
        include: {
            prices: {
                include: { market: true },
                orderBy: { date: 'desc' },
            },
        },
    });

    if (!urun) {
        console.log('Ürün bulunamadı.');
        return;
    }

    console.log('--- Ürün ---');
    console.log('  name:', urun.name);
    console.log('  marketKey (link):', urun.marketKey);
    console.log('  categoryId:', urun.categoryId);
    console.log('');
    console.log('--- Fiyat kayıtları (en yeni önce) ---');
    for (const p of urun.prices) {
        console.log(`  ${p.market.name}: ${p.amount} ₺  (tarih: ${p.date.toISOString()})  url: ${p.productUrl || '-'}`);
    }
}

main()
    .then(() => prisma.$disconnect())
    .catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
