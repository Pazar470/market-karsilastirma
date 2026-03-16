/**
 * Şüpheli/karşılaştırma için ürün tipi anahtarı (product type key).
 * İsimden gramaj/birim ve isteğe bağlı marka çıkarılıp "dana kavurma" gibi ham ürün tipi üretir.
 * Kullanım: (categoryId, productTypeKey) ile aynı tip ürünler gruplanır.
 */

/** Kampanya metni (isimden çıkarılır). */
const CAMPAIGN_PATTERN = /\s*\+?\d+\s*win\s*para(\s*kazan)?\s*/gi;

/** Gram/hacim birimleri (regex alternation). */
const WEIGHT_VOLUME_UNITS = 'g|gr|gram|ge|kg|ml|mlt|l|lt|litre|liter';

/** Bilinen markalar: ilk kelime bu listede ise çıkarılır; "dana" gibi ürün tipi kelimeleri korunur. */
const KNOWN_BRANDS = new Set(
  [
    'torku', 'pinar', 'ulker', 'etiler', 'dardanel', 'kayem', 'migros', 'm life',
    'danone', 'nestle', 'unilever', 'coca cola', 'pepsi', 'fanta', 'sipa',
    'gursu', 'barbaros', 'sutas', 'akgun', 'yayla', 'bellona', 'kukarella',
    'la vache qui rit', 'mis', 'muratbey', 'beyaz peynir', 'kale', 'pastavilla',
  ]
    .map((s) => s.toLowerCase().replace(/\s+/g, ' '))
);

/**
 * İsimden gramaj, hacim ve adet kalıplarını kaldırır.
 * Örnek: "Torku Dana Kavurma 1 KG" → "Torku Dana Kavurma"
 */
export function stripWeightAndUnitFromName(name: string): string {
  let s = (name ?? '')
    .replace(CAMPAIGN_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // N x M birim (2x60 G, 2 x 140 G)
  s = s.replace(
    new RegExp(`\\s*\\d+\\s*[xX×]\\s*\\d+\\s*(?:${WEIGHT_VOLUME_UNITS})\\b`, 'gi'),
    ' '
  );
  // Tekil sayı + birim (1 KG, 200 G, 500 gr, 1,5 L, 250 ml)
  s = s.replace(
    new RegExp(`\\s*\\d+([.,]\\d+)?\\s*(?:${WEIGHT_VOLUME_UNITS})\\b`, 'gi'),
    ' '
  );
  // N'li, N'lu, N adet (sondaki paket/adet)
  s = s.replace(/\s*\d+\s*'?(?:li|lu|lü|lı)\b/gi, ' ');
  s = s.replace(/\s*\d+\s*adet\b/gi, ' ');

  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/**
 * Normalize: Türkçe karakter → ASCII, küçük harf, çoklu boşluk → tek boşluk.
 */
function normalizeToKey(s: string): string {
  return (s ?? '')
    .trim()
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Ürün tipi anahtarını döndürür. Aynı key = aynı ürün tipi (kelime eşleşmesi için).
 * @param name Ürün adı
 * @param options.stripBrands true ise bilinen marka listesindeki ilk kelime çıkarılır
 * @returns Boşlukla ayrılmış küçük harf anahtar (örn. "dana kavurma"). Çok kısa (< 2 karakter) ise boş string.
 */
export function getProductTypeKey(
  name: string,
  options?: { stripBrands?: boolean }
): string {
  let s = stripWeightAndUnitFromName(name);
  s = normalizeToKey(s);

  if (options?.stripBrands) {
    const words = s.split(/\s+/).filter(Boolean);
    if (words.length > 1 && KNOWN_BRANDS.has(words[0])) {
      words.shift();
      s = words.join(' ');
    }
  }

  s = s.replace(/\s+/g, ' ').trim();
  // Tek kelime veya çok kısa key anlamsız karşılaştırma yapar; minimum anlamlı uzunluk
  if (s.length < 2) return '';
  return s;
}
