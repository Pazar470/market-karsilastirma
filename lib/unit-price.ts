/** Ürünün birim fiyatını hesaplar (₺/kg veya ₺/L veya ₺/adet). */
export function getUnitPrice(
    priceAmount: number,
    quantityAmount: number | null,
    quantityUnit: string | null
): { value: number; displayUnit: string } {
    const unit = (quantityUnit || '').toLowerCase();
    if (!quantityAmount || !quantityUnit || unit === 'adet' || unit === 'ad') {
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
