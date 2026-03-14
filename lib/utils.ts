
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Kampanya / reklam metinlerini isimden temizler (örn. "+15 win Para Kazan" → sayı gram sanılmasın). */
const CAMPAIGN_PATTERN = /\s*\+?\d+\s*win\s*para(\s*kazan)?\s*/gi;

/**
 * Sadece yumurta kategorisindeki ürünlerde kullanılır (bizim kategori ağacında slug=yumurta).
 * İsimde "30'lu", "20'li", "6'lı" veya "30 adet", "20 adet" gibi ifade varsa adet döner.
 * Sürpriz yumurta vb. için kullanılmaz; kategori kontrolü çağıran tarafta yapılır.
 */
export function parseQuantityForEggCategory(name: string): { amount: number; unit: 'adet' } | null {
  const cleaned = name.replace(CAMPAIGN_PATTERN, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  const liMatch = /(\d+)\s*'?(?:lu|li|lü|lı)\b/i.exec(cleaned);
  if (liMatch) {
    const count = parseInt(liMatch[1], 10);
    if (count > 0 && count <= 100) return { amount: count, unit: 'adet' };
  }
  const adetMatch = /(\d+)\s+adet\b/i.exec(cleaned);
  if (adetMatch) {
    const count = parseInt(adetMatch[1], 10);
    if (count > 0 && count <= 100) return { amount: count, unit: 'adet' };
  }
  return null;
}

/**
 * Product name içerisinden gramaj ve birimi ayıklar.
 * Örnekler:
 * "Mis Tam Yağlı Kaşar Peyniri 700 g" -> { amount: 0.7, unit: 'kg' }
 * "La Vache Qui Rit 8'li 100G" -> { amount: 0.1, unit: 'kg' } (gramaj öncelikli)
 * "Nescafe 17,5 g 10'lu" -> { amount: 0.175, unit: 'kg' } (17.5*10=175g toplam)
 * "Avokado Adet+15 win Para Kazan" -> { amount: 1, unit: 'adet' } (kampanya metni temizlenir, adet kalır)
 */
export function parseQuantity(name: string): { amount: number | null, unit: string | null } {
  const cleanedName = name.replace(CAMPAIGN_PATTERN, ' ').replace(/\s+/g, ' ').trim();
  const lowerName = cleanedName.toLowerCase();

  // Yumurta adet kuralı artık sadece bizim kategori ağacında "yumurta" olan ürünlerde uygulanıyor (db-utils, parseQuantityForEggCategory).

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

  // Diğer ağırlık/hacim (g, kg, ml, L, Lt, litre) — "3 Lt", "8'li 100G" gibi
  const weightVolumeRegex = /(\d+([.,]\d+)?)\s*(kg|g|gr|ml|mlt|l|lt|litre|liter)\b/gi;
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
    if (u === 'l' || u === 'lt' || u === 'litre' || u === 'liter') return { amount, unit: 'l' };
  }

  // İsimde "adet" geçiyorsa ve gram/kg/litre/ml yoksa → adet fiyatı (birim gram/kg/l/ml kabul etme)
  const hasAdet = /\badet\b/i.test(cleanedName);
  const hasWeightOrVolume = /\b(gram|gr?|kg|litre?|liter|ml|mlt|lt)\b/i.test(cleanedName);
  if (hasAdet && !hasWeightOrVolume) {
    return { amount: 1, unit: 'adet' };
  }

  // Pattern for numbers followed by optional unit
  const regex = /(\d+([.,]\d+)?)\s*(kg|g|gr|l|lt|litre|liter|ml|mlt|ad|adet)?\b/i;
  const match = lowerName.match(regex);

  if (match) {
    const matchIndex = match.index ?? 0;
    const matchLength = match[0].length;
    const textAfter = lowerName.slice(matchIndex + matchLength).trim();
    const charRightAfter = lowerName[matchIndex + matchLength];

    // Ölçü birimi "cm" veya inç (") — TV/ekran boyutu, gramaj değil; birim fiyat adet olmalı
    if (textAfter.startsWith('cm') || /^\s*cm\b/.test(' ' + textAfter)) {
      return { amount: null, unit: null };
    }
    if (charRightAfter === '"' || charRightAfter === '″' || charRightAfter === '\'' || /^["″']\s*/.test(textAfter) || textAfter.startsWith('inç') || textAfter.startsWith('inch')) {
      return { amount: null, unit: null };
    }

    let amount = parseFloat(match[1].replace(',', '.'));
    let unit = match[3] ? match[3].toLowerCase() : null;

    // RULE: If no unit is specified but number is > 10, assume Grams (common in Migros)
    // BUT sayıdan hemen sonra inç (") veya cm geliyorsa gram sayma (TV/ekran boyutu)
    // Ve: tipik ekran boyutu (10–250) + isimde ekran/inç/cm geçiyorsa gram sayma
    // AND check for counting suffixes like "li", "lu", "dilim" to avoid (e.g. "Kürdan 50'li")
    if (!unit && amount > 10) {
      const countSuffixes = ['li', 'lu', 'lü', 'lı', "'li", "'lu", "'lü", "'lı", "-li", "-lu", "-lü", "-lı", "dilim", "adet"];
      const isCount = countSuffixes.some(s => textAfter.startsWith(s));
      if (isCount) {
        return { amount: null, unit: null };
      }
      const looksLikeScreenSize = amount <= 250 && /\bekran\b|inç|inch|"\s*\d|\d+\s*cm\b/i.test(cleanedName);
      if (looksLikeScreenSize) {
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
    } else if (unit === 'lt' || unit === 'litre' || unit === 'liter') {
      unit = 'l';
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
