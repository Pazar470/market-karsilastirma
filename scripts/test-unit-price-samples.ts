/**
 * Örneklem birim fiyat testi. parseQuantity + getUnitPrice'ı sabit case'lerle çalıştırır.
 * Çalıştırma: npx tsx scripts/test-unit-price-samples.ts
 */
import { parseQuantity } from '../lib/utils';
import { getUnitPrice } from '../lib/unit-price';

type Case = {
  name: string;
  price: number;
  expectQty?: { amount: number; unit: string } | null;
  expectUnitPrice?: { value: number; displayUnit: string };
  /** DB'den yanlış gelirse scraper sonrası simülasyon (örn. yumurta 6'lı ama API 0.062 kg vermiş) */
  simulatedQty?: { amount: number; unit: string };
};

const cases: Case[] = [
  // Ton balığı: N x M G → toplam gram, birim fiyat = fiyat / (toplam kg)
  {
    name: 'Dardanel Ton Balığı 3x75 G',
    price: 365,
    expectQty: { amount: 0.225, unit: 'kg' },
    expectUnitPrice: { value: 365 / 0.225, displayUnit: 'kg' },
  },
  {
    name: 'Dardanel Ayçiçek Yağlı Ton Balığı 6 x 75 G',
    price: 333.71,
    expectQty: { amount: 0.45, unit: 'kg' },
    expectUnitPrice: { value: 333.71 / 0.45, displayUnit: 'kg' },
  },
  {
    name: 'Dardanel Ton Balığı 2x170 G',
    price: 385,
    expectQty: { amount: 0.34, unit: 'kg' },
    expectUnitPrice: { value: 385 / 0.34, displayUnit: 'kg' },
  },
  // Balık 400/600 Kg → 1 kg (boy aralığı)
  {
    name: 'Çipura 400/600 Kg',
    price: 499.9,
    expectQty: { amount: 1, unit: 'kg' },
    expectUnitPrice: { value: 499.9, displayUnit: 'kg' },
  },
  // Mezgit: sonda Kg → 1 kg
  {
    name: 'Mezgit Karadeniz Kg',
    price: 449.9,
    expectQty: { amount: 1, unit: 'kg' },
    expectUnitPrice: { value: 449.9, displayUnit: 'kg' },
  },
  // Mezgit eğer API 1000 kg vermişse (gram yanlış kg yazılmış) → effectiveQty 1
  {
    name: 'Mezgit Karadeniz Kg',
    price: 449.9,
    simulatedQty: { amount: 1000, unit: 'kg' },
    expectUnitPrice: { value: 449.9, displayUnit: 'kg' },
  },
  // Yumurta 20'li, 15'li → adet, fiyat/adet
  {
    name: "Yeniköy Çiftliği Yumurta XL Boy 20'li",
    price: 179,
    expectQty: { amount: 20, unit: 'adet' },
    expectUnitPrice: { value: 179 / 20, displayUnit: 'adet' },
  },
  {
    name: "Naturaköy Gezen 15'li Yumurta M Orta Boy (53-62...",
    price: 169.95,
    expectQty: { amount: 15, unit: 'adet' },
    expectUnitPrice: { value: 169.95 / 15, displayUnit: 'adet' },
  },
  // Yumurta 6'lı (53-62 G): gram olsa bile adet öncelikli
  {
    name: "Keskinoğlu M - Orta Boy Yumurta 6'lı (53 - 62 G)",
    price: 47.95,
    expectQty: { amount: 6, unit: 'adet' },
    expectUnitPrice: { value: 47.95 / 6, displayUnit: 'adet' },
  },
  // Yumurta: DB'de yanlışlıkla 0.062 kg gelirse bile adet göstermeli (parseQuantityForEggCategory)
  {
    name: "Keskinoğlu M - Orta Boy Yumurta 6'lı (53 - 62 G)",
    price: 47.95,
    simulatedQty: { amount: 0.062, unit: 'kg' },
    expectUnitPrice: { value: 47.95 / 6, displayUnit: 'adet' },
  },
  // Ketçap + mayonez → adet (set fiyatı), gramaj kullanılmamalı
  {
    name: "Hellmann's İkili Set Ketçap 460 G + Mayonez 385 G",
    price: 224.95,
    expectQty: { amount: 1, unit: 'adet' },
    expectUnitPrice: { value: 224.95, displayUnit: 'adet' },
  },
  {
    name: 'Tat Sıkı Dostlar 1210 G (Ketçap 650 G-Mayonez 560 G)',
    price: 167.97,
    expectQty: { amount: 1, unit: 'adet' },
    expectUnitPrice: { value: 167.97, displayUnit: 'adet' },
  },
  // Tek kutu ton 80 G
  {
    name: 'Dardanel Ayçiçekyağlı Poşet Ton 80 G',
    price: 116.21,
    expectQty: { amount: 0.08, unit: 'kg' },
    expectUnitPrice: { value: 116.21 / 0.08, displayUnit: 'kg' },
  },
];

function approxEqual(a: number, b: number, tol = 0.01): boolean {
  return Math.abs(a - b) <= tol;
}

function main() {
  console.log('=== Örneklem birim fiyat testi ===\n');
  let pass = 0;
  let fail = 0;

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const label = `${i + 1}. ${c.name.slice(0, 50)}...`;
    const qty = c.simulatedQty ?? parseQuantity(c.name);
    const unitPrice = getUnitPrice(c.price, qty?.amount ?? null, qty?.unit ?? null, c.name);

    let ok = true;
    const msgs: string[] = [];

    if (c.expectQty !== undefined && c.expectQty !== null) {
      const amtOk = qty?.amount != null && approxEqual(qty.amount, c.expectQty.amount);
      const unitOk = (qty?.unit ?? '').toLowerCase() === c.expectQty.unit.toLowerCase();
      if (!amtOk || !unitOk) {
        ok = false;
        msgs.push(`parseQuantity: beklenen ${c.expectQty.amount} ${c.expectQty.unit}, gelen ${qty?.amount ?? 'null'} ${qty?.unit ?? 'null'}`);
      }
    }

    if (c.expectUnitPrice !== undefined) {
      const valOk = approxEqual(unitPrice.value, c.expectUnitPrice.value);
      const displayOk = unitPrice.displayUnit === c.expectUnitPrice.displayUnit;
      if (!valOk || !displayOk) {
        ok = false;
        msgs.push(`getUnitPrice: beklenen ${c.expectUnitPrice.value.toFixed(2)} ₺/${c.expectUnitPrice.displayUnit}, gelen ${unitPrice.value.toFixed(2)} ₺/${unitPrice.displayUnit}`);
      }
    }

    if (ok) {
      pass++;
      console.log(`✅ ${label}`);
    } else {
      fail++;
      console.log(`❌ ${label}`);
      msgs.forEach((m) => console.log(`   ${m}`));
    }
  }

  console.log(`\n--- Sonuç: ${pass} geçti, ${fail} kaldı ---`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
