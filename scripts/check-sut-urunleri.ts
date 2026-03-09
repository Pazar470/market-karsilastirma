/**
 * sut-c-470 (Süt) sayfasındaki ürünlerin listemizde olup olmadığını kontrol eder.
 * Çalıştırma: npx ts-node --esm scripts/check-sut-urunleri.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ORNEK_URUNLER = [
    'Mia Pastörize',
    'Mis Uht Süt',
    'İçim',
    'Sek Çikolatalı',
    'Mis Muzlu Süt',
    'Mis Çilekli Süt',
    'Mis Kakaolu Süt',
    'Danone Hüpper',
];

async function main() {
    const sok = await prisma.market.findFirst({ where: { name: 'Şok' } });
    if (!sok) {
        console.log('Şok market bulunamadı.');
        return;
    }

    console.log('--- Şok\'tan Süt / süt ürünü kayıtları (isimde "Süt" geçen) ---\n');
    const sutUrunleri = await prisma.product.findMany({
        where: {
            name: { contains: 'Süt' },
            prices: { some: { marketId: sok.id } },
        },
        select: { name: true, id: true },
        take: 30,
    });
    console.log(`Bulunan: ${sutUrunleri.length} ürün (max 30 gösteriliyor)\n`);
    sutUrunleri.forEach(p => console.log('  -', p.name));

    console.log('\n--- Ekrandaki örnek ürünler listemizde var mı? ---\n');
    for (const arama of ORNEK_URUNLER) {
        const bulunan = await prisma.product.findFirst({
            where: {
                name: { contains: arama },
                prices: { some: { marketId: sok.id } },
            },
            select: { name: true },
        });
        console.log(`  "${arama}" → ${bulunan ? bulunan.name : 'YOK'}`);
    }
}

main()
    .then(() => prisma.$disconnect())
    .catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
