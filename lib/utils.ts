
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Product name içerisinden gramaj ve birimi ayıklar.
 * Örnekler: 
 * "Mis Tam Yağlı Kaşar Peyniri 700 g" -> { amount: 0.7, unit: 'kg' }
 * "Tarabya Kaşar Peyniri 1 Kg" -> { amount: 1, unit: 'kg' }
 * "X Peynir 250 G" -> { amount: 0.25, unit: 'kg' }
 */
export function parseQuantity(name: string): { amount: number | null, unit: string | null } {
  const lowerName = name.toLowerCase();

  // Pattern for numbers followed by optional unit
  const regex = /(\d+([.,]\d+)?)\s*(kg|g|gr|l|ml|mlt|ad|adet)?\b/i;
  const match = lowerName.match(regex);

  if (match) {
    let amount = parseFloat(match[1].replace(',', '.'));
    let unit = match[3] ? match[3].toLowerCase() : null;

    // RULE: If no unit is specified but number is > 10, assume Grams (common in Migros)
    // BUT check for counting suffixes like "li", "lu", "dilim" to avoid (e.g. "Kürdan 50'li")
    if (!unit && amount > 10) {
      const matchIndex = match.index || 0;
      const matchLength = match[0].length;
      const textAfter = lowerName.slice(matchIndex + matchLength).trim();
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
    } else if (unit === 'kg') {
      unit = 'kg';
    } else if (unit === 'l') {
      unit = 'l';
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

  return { amount: null, unit: null };
}
