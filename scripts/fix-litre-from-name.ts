/**
 * İsimde "3 Lt", "5 litre" gibi hacim geçen ama DB'de adet/null kayıtlı ürünleri düzeltir.
 * parseQuantity ile yeniden parse edip quantityAmount + quantityUnit = 'l' yazar.
 * Böylece 3 Lt ürün fiyatı 3'e bölünüp ₺/L gösterilir.
 */
import { PrismaClient } from '@prisma/client';
import { parseQuantity } from '../lib/utils';

const prisma = new PrismaClient();

const LITRE_IN_NAME = /\d+\s*(lt|litre|liter)\b/i;

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, quantityAmount: true, quantityUnit: true },
  });

  let fixed = 0;
  for (const p of products) {
    if (!p.name || !LITRE_IN_NAME.test(p.name)) continue;
    const parsed = parseQuantity(p.name);
    if (!parsed.amount || !parsed.unit || parsed.unit !== 'l') continue;
    const currentOk = p.quantityUnit === 'l' && p.quantityAmount != null && Math.abs(p.quantityAmount - parsed.amount) < 0.01;
    if (currentOk) continue;

    await prisma.product.update({
      where: { id: p.id },
      data: { quantityAmount: parsed.amount, quantityUnit: parsed.unit },
    });
    console.log(`  ${p.name?.slice(0, 55)}... → ${parsed.amount} ${parsed.unit}`);
    fixed++;
  }

  console.log(fixed === 0 ? 'Düzeltilecek Lt/litre kaydı yok.' : `Bitti. ${fixed} ürün güncellendi.`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
