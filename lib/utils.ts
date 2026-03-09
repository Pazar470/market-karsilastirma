
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Product name içerisinden gramaj ve birimi ayıklar.
 * Örnekler:
 * "Mis Tam Yağlı Kaşar Peyniri 700 g" -> { amount: 0.7, unit: 'kg' }
 * "La Vache Qui Rit 8'li 100G" -> { amount: 0.1, unit: 'kg' } (gramaj öncelikli)
 * "Nescafe 17,5 g 10'lu" -> { amount: 0.175, unit: 'kg' } (17.5*10=175g toplam)
 */
export function parseQuantity(name: string): { amount: number | null, unit: string | null } {
  const lowerName = name.toLowerCase();

  // "X g Y'lu" / "X gr 10'lu" → toplam gram = X * Y (paket başı gram × adet). X büyükse (örn. 170) zaten toplam olabilir, çarpmayalım.
  const perUnitThenCount = /(\d+([.,]\d+)?)\s*(g|gr)\b\s*(\d+)\s*'?lu\b/i.exec(lowerName);
  if (perUnitThenCount) {
    const perUnit = parseFloat(perUnitThenCount[1].replace(',', '.'));
    const count = parseInt(perUnitThenCount[4], 10);
    if (count > 0 && count <= 1000 && perUnit <= 100) {
      const totalG = perUnit * count;
      return { amount: totalG / 1000, unit: 'kg' };
    }
  }

  // "170 g" veya "170 gr" tek başına (toplam gramaj) — önce bunu kontrol et
  const totalGramOnly = /\b(1[0-4]\d|1[6-9]\d|[2-9]\d{2}|\d{4,})\s*(g|gr)\b(?!\s*\d)/i.exec(lowerName);
  if (totalGramOnly) {
    const total = parseFloat(totalGramOnly[1].replace(',', '.'));
    if (total >= 10 && total <= 50000) {
      return { amount: total / 1000, unit: 'kg' };
    }
  }

  // Diğer ağırlık/hacim (g, kg, ml, L) — "8'li 100G" gibi ifadelerde 100g kullanılır
  const weightVolumeRegex = /(\d+([.,]\d+)?)\s*(kg|g|gr|ml|mlt|l)\b/gi;
  const wvMatch = weightVolumeRegex.exec(lowerName);
  if (wvMatch) {
    let amount = parseFloat(wvMatch[1].replace(',', '.'));
    const u = (wvMatch[3] || '').toLowerCase();
    if (u === 'g' || u === 'gr') {
      amount = amount / 1000;
      return { amount, unit: 'kg' };
    }
    if (u === 'ml' || u === 'mlt') {
      amount = amount / 1000;
      return { amount, unit: 'l' };
    }
    if (u === 'kg') return { amount, unit: 'kg' };
    if (u === 'l') return { amount, unit: 'l' };
  }

  // Pattern for numbers followed by optional unit
  const regex = /(\d+([.,]\d+)?)\s*(kg|g|gr|l|ml|mlt|ad|adet)?\b/i;
  const match = lowerName.match(regex);

  if (match) {
    const matchIndex = match.index ?? 0;
    const matchLength = match[0].length;
    const textAfter = lowerName.slice(matchIndex + matchLength).trim();

    // Ölçü birimi "cm" (boyut) — adet fiyatı alınmalı, birim fiyat kg/L değil
    if (textAfter.startsWith('cm') || /^\s*cm\b/.test(' ' + textAfter)) {
      return { amount: null, unit: null };
    }

    let amount = parseFloat(match[1].replace(',', '.'));
    let unit = match[3] ? match[3].toLowerCase() : null;

    // RULE: If no unit is specified but number is > 10, assume Grams (common in Migros)
    // BUT check for counting suffixes like "li", "lu", "dilim" to avoid (e.g. "Kürdan 50'li")
    if (!unit && amount > 10) {
      const countSuffixes = ['li', 'lu', 'lü', 'lı', "'li", "'lu", "'lü", "'lı", "-li", "-lu", "-lü", "-lı", "dilim", "adet"];
      const isCount = countSuffixes.some(s => textAfter.startsWith(s));
      if (isCount) {
        return { amount: null, unit: null };
      }
      unit = 'g';
    }

    // Normalize units
    if (unit === 'g' || unit === 'gr') {
      amount = amount / 1000;
      unit = 'kg';
    } else if (unit === 'ml' || unit === 'mlt') {
      amount = amount / 1000;
      unit = 'l';
    } else if (unit === 'kg' || unit === 'l') {
      // keep
    } else if (unit === 'ad' || unit === 'adet') {
      unit = 'adet';
      if (!amount || amount <= 0) amount = 1;
    }

    return { amount, unit };
  }

  // Handle standalone "Kg" or "L" at the end of the string (common in Migros for open weight)
  if (lowerName.endsWith(' kg')) {
    return { amount: 1, unit: 'kg' };
  }
  if (lowerName.endsWith(' l')) {
    return { amount: 1, unit: 'l' };
  }
  // Ürün adı "Adet" ile bitiyorsa (Dereotu Adet vb.) adet fiyatı
  if (/\s+adet\s*$/i.test(name.trim())) {
    return { amount: 1, unit: 'adet' };
  }

  return { amount: null, unit: null };
}

/** Donuk ürün / yerli üretim rozeti vb. görsel URL'si mi? Böyle URL'ler placeholder ile değiştirilir. */
export function isProductImagePlaceholder(imageUrl: string | null | undefined): boolean {
  if (!imageUrl || typeof imageUrl !== 'string') return true;
  const lower = imageUrl.toLowerCase();
  return /yerli|donuk|badge|dondurulmus|yerliuretim|donukurun|glutensiz|vegan|helal/.test(lower);
}
