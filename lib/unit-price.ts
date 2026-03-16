import { parseQuantityForEggCategory } from './utils';

/** TV vb. için adet say: uzunluk birimleri (inç, cm, m, metre) adet fiyatı olarak kabul edilir. */
function isCountLikeUnit(rawUnit: string | null | undefined): boolean {
    const unit = (rawUnit || '').toLowerCase();
    if (!unit) return false;
    if (unit === 'adet' || unit === 'ad') return true;
    const lengthUnits = ['cm', 'mm', 'm', 'metre', 'inch', 'inç', '"'];
    return lengthUnits.includes(unit);
}

/**
 * Ürün adına göre DB'de kg/litre kayıtlı olsa bile birim fiyatı "adet" göstermeli mi?
 * TV/ekran: inç/cm yanlış kg sanılmış; Avokado Adet: adet olması gerekirken kg gelmiş.
 */
export function shouldDisplayAsAdet(
    productName: string | null | undefined,
    quantityAmount: number | null,
    quantityUnit: string | null
): boolean {
    const name = (productName ?? '').toLowerCase();
    const unit = (quantityUnit ?? '').toLowerCase();
    if (!quantityAmount || !quantityUnit) return true;
    if (unit === 'adet' || unit === 'ad') return true;
    const lengthUnits = ['cm', 'mm', 'm', 'metre', 'inch', 'inç', '"'];
    if (lengthUnits.includes(unit)) return true;

    if (unit === 'kg') {
        const looksLikeTv = /\bekran\b|inç|inch|"\s*\d|\d+\s*cm\b/i.test(name);
        if (looksLikeTv && (quantityAmount < 0.1 || (quantityAmount >= 10 && quantityAmount <= 500))) return true;
        const hasAdet = /\badet\b/i.test(name);
        const hasWeightOrVolume = /\b(gram|gr?|kg|litre?|liter|ml|mlt|lt)\b/i.test(name);
        if (hasAdet && !hasWeightOrVolume && quantityAmount > 0 && quantityAmount < 1) return true;
    }
    return false;
}

/** Ürünün birim fiyatını hesaplar (₺/kg veya ₺/L veya ₺/adet). */
export function getUnitPrice(
    priceAmount: number,
    quantityAmount: number | null,
    quantityUnit: string | null,
    productName?: string | null
): { value: number; displayUnit: string } {
    const unit = (quantityUnit || '').toLowerCase();
    if (productName != null && shouldDisplayAsAdet(productName, quantityAmount, quantityUnit)) {
        const adetValue = (quantityAmount != null && quantityAmount > 1 && (unit === 'adet' || unit === 'ad'))
            ? priceAmount / quantityAmount
            : priceAmount;
        return { value: adetValue, displayUnit: 'adet' };
    }
    if (!quantityAmount || !quantityUnit || isCountLikeUnit(unit)) {
        const adetValue = (quantityAmount != null && quantityAmount > 1 && (unit === 'adet' || unit === 'ad'))
            ? priceAmount / quantityAmount
            : priceAmount;
        return { value: adetValue, displayUnit: 'adet' };
    }
    // Yumurta: DB'de kg kayıtlı olsa bile isimde 10'lu/12 Adet varsa adet fiyatı göster (toplam / adet)
    if (productName != null && /\byumurta\b/i.test(productName)) {
        const eggQty = parseQuantityForEggCategory(productName);
        if (eggQty != null && eggQty.amount >= 2) {
            return { value: priceAmount / eggQty.amount, displayUnit: 'adet' };
        }
    }
    // Kg biriminde 1000 değeri genelde gram olarak gelip yanlışlıkla kg yazılmıştır (Görsel 3 hatası)
    let effectiveQty = quantityAmount;
    if (unit === 'kg' && quantityAmount === 1000) effectiveQty = 1;
    let unitPrice = priceAmount / effectiveQty;
    let displayUnit = unit === 'l' || unit === 'lt' ? 'L' : 'kg';
    if (unit === 'g' || unit === 'gr' || unit === 'ml') {
        unitPrice = unitPrice * 1000;
        displayUnit = unit === 'ml' ? 'L' : 'kg';
    }
    return { value: unitPrice, displayUnit };
}

export function formatUnitPrice(value: number, displayUnit: string): string {
    return `${value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺/${displayUnit}`;
}
