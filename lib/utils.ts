
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Kampanya / reklam metinlerini isimden temizler (örn. "+15 win Para Kazan" → sayı gram sanılmasın). */
const CAMPAIGN_PATTERN = /\s*\+?\d+\s*win\s*para(\s*kazan)?\s*/gi;

/** Gram birimleri: sayı + boşluk(opsiyonel) + birim. Varyasyonlar: g, G, gr, GR, gram, ge (paket "200ge" yazımı). */
const GRAM_UNITS = 'g|gr|gram|ge';

/**
 * Sadece yumurta kategorisindeki ürünlerde kullanılır (bizim kategori ağacında slug=yumurta).
 * İsimde "30'lu", "20'li", "6'lı" veya "30 adet", "20 adet" gibi ifade varsa adet döner.
 * Sürpriz yumurta vb. için kullanılmaz; kategori kontrolü çağıran tarafta yapılır.
 */
export function parseQuantityForEggCategory(name: string): { amount: number; unit: 'adet' } | null {
  const cleaned = name.replace(CAMPAIGN_PATTERN, ' ').replace(/\s+/g, ' ').trim();
  const lower = cleaned.toLowerCase();
  const search = lower.includes('yumurta') ? cleaned.slice(lower.indexOf('yumurta')) : cleaned;
  const liMatch = /(\d+)\s*['\u2019]?l[i\u0131uü]\s*(?:paket)?/i.exec(search);
  if (liMatch) {
    const count = parseInt(liMatch[1], 10);
    if (count > 0 && count <= 100) return { amount: count, unit: 'adet' };
  }
  const adetMatch = /(\d+)\s+adet\b/i.exec(search);
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

/** Birim fiyat hesabında ağırlık/hacim birimi mi? (kg, l → evet; adet → hayır). İsimde sayı+birim varsa öncelik isimdedir. */
export function isWeightOrVolumeUnit(unit: string | null | undefined): boolean {
  const u = (unit ?? '').toLowerCase();
  return u === 'kg' || u === 'l' || u === 'lt' || u === 'litre' || u === 'liter' || u === 'ml' || u === 'mlt' || u === 'g' || u === 'gr' || u === 'gram';
}

export function parseQuantity(name: string): { amount: number | null, unit: string | null } {
  const cleanedName = name.replace(CAMPAIGN_PATTERN, ' ').replace(/\s+/g, ' ').trim();
  const lowerName = cleanedName.toLowerCase();

  // Balık: "400/600 Kg", "600/800 Kg" → boyut aralığı, miktar 1 kg (fiyat 1 kg fiyatıdır)
  const slashKg = /\b\d+\s*\/\s*\d+\s*kg\b/i.exec(lowerName);
  if (slashKg) return { amount: 1, unit: 'kg' };

  // Ketçap + mayonez setleri: birim fiyat = set fiyatı (₺/adet), gramaj kullanma
  if (/\bketçap\b/i.test(cleanedName) && /\bmayonez\b/i.test(cleanedName)) {
    return { amount: 1, unit: 'adet' };
  }

  // Global: "N x M [birim]" — tüm ağırlık/hacim (2x60 G, 4x50 ML, 2x1 L vb.). Toplam = N*M, sonra birime göre kg veya L.
  const packTimesUnit = new RegExp(`\\b(\\d+)\\s*[xX×]\\s*(\\d+)\\s*(${GRAM_UNITS}|kg|ml|mlt|l|lt|litre|liter)\\b`, 'i').exec(lowerName);
  if (packTimesUnit) {
    const n = parseInt(packTimesUnit[1], 10);
    const m = parseInt(packTimesUnit[2], 10);
    const u = (packTimesUnit[3] || '').toLowerCase();
    if (n >= 1 && n <= 100 && m >= 1 && m <= 10000) {
      const total = n * m;
      if (['g', 'gr', 'gram', 'ge'].includes(u)) return { amount: total / 1000, unit: 'kg' };
      if (u === 'kg') return { amount: total, unit: 'kg' };
      if (u === 'ml' || u === 'mlt') return { amount: total / 1000, unit: 'l' };
      if (u === 'l' || u === 'lt' || u === 'litre' || u === 'liter') return { amount: total, unit: 'l' };
    }
  }

  // Sonda tek "Kg" / "L": önünde sayı yoksa 1 kg veya 1 L (örn. "Mantı-Ye 100 Etli Bohça Mantısı Kg" → 1 kg; "100" marka adında, gram değil)
  if (/\s+kg\s*$/i.test(lowerName)) {
    const beforeKg = lowerName.replace(/\s+kg\s*$/i, '').trim();
    const lastWord = beforeKg.split(/\s+/).pop() || '';
    if (!/^\d+([.,]\d+)?$/.test(lastWord)) return { amount: 1, unit: 'kg' };
  }
  if (/\s+l\s*$/i.test(lowerName)) {
    const beforeL = lowerName.replace(/\s+l\s*$/i, '').trim();
    const lastWord = beforeL.split(/\s+/).pop() || '';
    if (!/^\d+([.,]\d+)?$/.test(lastWord)) return { amount: 1, unit: 'l' };
  }

  // Yumurta: isimde gram (53-62 G) olsa bile paket adedi öncelikli → 10'lu = 10 adet, birim fiyat = toplam/10
  // Sadece "yumurta" kelimesinden sonra N'li ara; "53 - 62 G" içindeki 53/62 ile eşleşmesin. lı = l + ı (U+0131)
  if (/\byumurta\b/i.test(cleanedName)) {
    const yumurtaIdx = lowerName.indexOf('yumurta');
    const afterYumurta = cleanedName.slice(yumurtaIdx >= 0 ? yumurtaIdx : 0);
    const yLi = /(\d+)\s*['\u2019]?l[i\u0131uü]\s*(?:paket)?/i.exec(afterYumurta);
    if (yLi) {
      const n = parseInt(yLi[1], 10);
      if (n >= 2 && n <= 100) return { amount: n, unit: 'adet' };
    }
    const yAdet = /(\d+)\s+adet\b/i.exec(afterYumurta);
    if (yAdet) {
      const n = parseInt(yAdet[1], 10);
      if (n >= 2 && n <= 100) return { amount: n, unit: 'adet' };
    }
  }

  // "X g Y'lu" / "X gr 10'lu" → toplam gram = X * Y. Yumurta "53 - 62 G" gibi aralık burada eşleşmesin (arada "lu" yok).
  const perUnitThenCount = new RegExp(`(\\d+([.,]\\d+)?)\\s*(${GRAM_UNITS})\\b\\s*(\\d+)\\s*['\u2019]?lu\\b`, 'i').exec(lowerName);
  if (perUnitThenCount) {
    const perUnit = parseFloat(perUnitThenCount[1].replace(',', '.'));
    const count = parseInt(perUnitThenCount[4], 10);
    if (count > 0 && count <= 1000 && perUnit <= 100) {
      const totalG = perUnit * count;
      return { amount: totalG / 1000, unit: 'kg' };
    }
  }

  // "200 G", "170 g", "170 gr", "200ge" tek başına (toplam gramaj) — sayı + boşluk(opsiyonel) + gram birimi
  const totalGramOnly = new RegExp(`\\b(1[0-4]\\d|1[6-9]\\d|[2-9]\\d{2}|\\d{4,})\\s*(${GRAM_UNITS})\\b(?!\\s*\\d)`, 'i').exec(lowerName);
  if (totalGramOnly) {
    const total = parseFloat(totalGramOnly[1].replace(',', '.'));
    if (total >= 10 && total <= 50000) {
      return { amount: total / 1000, unit: 'kg' };
    }
  }

  // Diğer ağırlık/hacim (g, G, gr, gram, ge, kg, ml, L, Lt, litre) — "200 G", "3 Lt", "8'li 100G", "200ge" gibi
  const weightVolumeRegex = new RegExp(`(\\d+([.,]\\d+)?)\\s*(${GRAM_UNITS}|kg|ml|mlt|l|lt|litre|liter)\\b`, 'gi');
  const wvMatch = weightVolumeRegex.exec(lowerName);
  if (wvMatch) {
    let amount = parseFloat(wvMatch[1].replace(',', '.'));
    const u = (wvMatch[3] || '').toLowerCase();
    if (['g', 'gr', 'gram', 'ge'].includes(u)) {
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

  // 2'li Paket, 3'lü, N'li — isimde "adet" olmasa da paket adedi (avokado 2'li paket, yumurta 10'lu vb.)
  const hasWeightOrVolume = new RegExp(`\\b(gram|${GRAM_UNITS}|kg|litre?|liter|ml|mlt|lt)\\b`, 'i').test(cleanedName);
  if (!hasWeightOrVolume) {
    const paketMatch = /(\d+)\s*'?(?:li|lu|lü|lı)\s*(?:paket)?\b/i.exec(cleanedName);
    if (paketMatch) {
      const n = parseInt(paketMatch[1], 10);
      if (n >= 2 && n <= 24) {
        if (n >= 6 && n <= 24 && /\bbulyon\b/i.test(cleanedName)) return { amount: (n * 10) / 1000, unit: 'kg' };
        return { amount: n, unit: 'adet' };
      }
    }
  }

  // İsimde "adet" geçiyorsa ve gram/kg/litre/ml yoksa → adet fiyatı. 2'li, 3'lü paket ise miktar = N (birim fiyat = fiyat/N).
  const hasAdet = /\badet\b/i.test(cleanedName);
  if (hasAdet && !hasWeightOrVolume) {
    const paketAdet = /(\d+)\s*'?(?:li|lu|lü|lı)\b/i.exec(cleanedName);
    if (paketAdet) {
      const n = parseInt(paketAdet[1], 10);
      if (n >= 2 && n <= 24) {
        if (n >= 6 && n <= 24 && /\bbulyon\b/i.test(cleanedName)) return { amount: (n * 10) / 1000, unit: 'kg' };
        return { amount: n, unit: 'adet' };
      }
    }
    const adetNum = /(\d+)\s+adet\b/i.exec(cleanedName);
    if (adetNum) {
      const n = parseInt(adetNum[1], 10);
      if (n >= 6 && n <= 24 && /\bbulyon\b/i.test(cleanedName)) return { amount: (n * 10) / 1000, unit: 'kg' };
      if (n >= 2 && n <= 100) return { amount: n, unit: 'adet' };
    }
    return { amount: 1, unit: 'adet' };
  }

  // Pattern for numbers followed by optional unit (g, G, gr, gram, ge dahil)
  const regex = new RegExp(`(\\d+([.,]\\d+)?)\\s*(${GRAM_UNITS}|kg|l|lt|litre|liter|ml|mlt|ad|adet)?\\b`, 'i');
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

    // Normalize units (g, gr, gram, ge → kg)
    if (unit != null && ['g', 'gr', 'gram', 'ge'].includes(unit)) {
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

/** A101: /kapida/u/ID 404 veriyor; site /kapida/[slug]_p-[id] kullanıyor. Gösterim için bu formatı döndürür. */
export function getA101DisplayUrl(marketKey: string | null | undefined, productName: string | null | undefined): string | null {
  if (!marketKey || typeof marketKey !== 'string') return null;
  const m = /\/kapida\/u\/(\d+)/i.exec(marketKey) || /_p-(\d+)/i.exec(marketKey);
  const id = m ? m[1] : null;
  if (!id) return marketKey;
  const slug = (productName || 'urun')
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 80) || 'urun';
  return `https://www.a101.com.tr/kapida/${slug}_p-${id}`;
}
