/**
 * Bir (market, kategori kodu) çiftini MarketCategoryManuel'den siler; böylece o kategori otomatik (ODS) yoluna düşer.
 * Çalıştırma: npx tsx scripts/remove-manuel-market-code.ts Migros "otlar-yesillikler-c-3f5"
 */
import 'dotenv/config';
import { prisma } from '../lib/db';

async function main() {
    const marketName = process.argv[2];
    const marketCategoryCode = process.argv[3];
    if (!marketName || !marketCategoryCode) {
        console.error('Kullanım: npx tsx scripts/remove-manuel-market-code.ts <marketName> <marketCategoryCode>');
        process.exit(1);
    }
    const deleted = await prisma.marketCategoryManuel.delete({
        where: {
            marketName_marketCategoryCode: { marketName, marketCategoryCode },
        },
    });
    console.log('Manuel listesinden çıkarıldı:', deleted.marketName, deleted.marketCategoryCode);
}

main()
    .catch((e) => {
        if (e?.code === 'P2025') {
            console.error('Kayıt bulunamadı (zaten manuel değil veya kod yanlış).');
        } else {
            console.error(e);
        }
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
