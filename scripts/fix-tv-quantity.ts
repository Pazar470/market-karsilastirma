/**
 * TV / ekran ürünlerinde inç (") veya cm yanlış gramaj sanılıp kg kaydedilmiş olabilir.
 * Bu script: isimde ekran/inç/cm geçen ve quantity'si kg + çok küçük miktar (< 0.5) olan
 * ürünleri quantity'siz yapar; böylece birim fiyat ₺/adet gösterilir.
 * Sonraki taramada parseQuantity inç/cm'i gram saymayacağı için doğru kalır.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TV_OR_DIMENSION_NAME = /ekran|inç|inch|"\s*\d|\d+\s*cm\b/i;

async function main() {
  const products = await prisma.product.findMany({
    where: {
      quantityUnit: 'kg',
      quantityAmount: { not: null, lt: 0.5, gt: 0 },
    },
    select: { id: true, name: true, quantityAmount: true, quantityUnit: true },
  });

  const toFix = products.filter((p) => TV_OR_DIMENSION_NAME.test(p.name ?? ''));
  if (toFix.length === 0) {
    console.log('Düzeltilecek TV/ekran kaydı yok.');
    return;
  }

  console.log(`${toFix.length} ürün TV/ekran gibi görünüyor ve kg ile yanlış kayıtlı; quantity null yapılıyor.`);
  for (const p of toFix) {
    await prisma.product.update({
      where: { id: p.id },
      data: { quantityAmount: null, quantityUnit: null },
    });
    console.log(`  ${p.name?.slice(0, 50)}... (${p.quantityAmount} kg → null)`);
  }
  console.log('Bitti.');
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
