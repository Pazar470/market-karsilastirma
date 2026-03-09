/**
 * Mapping'te olan (market, kategori kodu) için hâlâ categoryId=null olan ürünleri
 * o mapping'in categoryId'si ile günceller. Böylece "zaten otomatik eşlenmiş kod" altındaki
 * gereksiz onay bekleyenler admin listesinden düşer.
 *
 * Manuel/Mapping tablolarına dokunmaz. Sadece Product günceller.
 * (Tarama sonrası bu işlem otomatik yapılır; manuel çalıştırmak için:)
 * Çalıştırma: npx tsx scripts/sync-mapping-to-null-products.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { syncMappingToNullProducts } from '../lib/category-sync';

const prisma = new PrismaClient();

async function main() {
    const totalUpdated = await syncMappingToNullProducts(prisma);
    console.log('Toplam güncellenen ürün:', totalUpdated);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
