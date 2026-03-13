/** TV vb. için adet say: uzunluk birimleri (inç, cm, m, metre) adet fiyatı olarak kabul edilir. */
function isCountLikeUnit(rawUnit: string | null | undefined): boolean {
    const unit = (rawUnit || '').toLowerCase();
    if (!unit) return false;
    if (unit === 'adet' || unit === 'ad') return true;
    const lengthUnits = ['cm', 'mm', 'm', 'metre', 'inch', 'inç', '"'];
    return lengthUnits.includes(unit);
}

/** Ürünün birim fiyatını hesaplar (₺/kg veya ₺/L veya ₺/adet). */
export function getUnitPrice(
    priceAmount: number,
    quantityAmount: number | null,
    quantityUnit: string | null
): { value: number; displayUnit: string } {
    const unit = (quantityUnit || '').toLowerCase();
    if (!quantityAmount || !quantityUnit || isCountLikeUnit(unit)) {
        return { value: priceAmount, displayUnit: 'adet' };
    }
    let unitPrice = priceAmount / quantityAmount;
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
