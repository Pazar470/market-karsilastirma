/**
 * Kök kategorilerin gösterim sırası. API'den gelen ağaç bu sıraya göre sıralanır.
 */
export const CATEGORY_ORDER = [
    'meyve sebze',
    'meyve ve sebze',
    'et balık tavuk',
    'et tavuk balık',
    'temel gıda',
    'süt ürünleri',
    'süt ve süt ürünleri',
    'kahvaltılık',
    'içecek',
    'atıştırmalık',
    'fırın pastane',
    'fırın ve pastane',
    'hazır yemek dondurulmuş',
    'hazır yemek ve dondurulmuş',
    'temizlik',
    'kağıt ürünleri',
    'kağıt ürünler',
    'kişisel bakım kozmetik',
    'kişisel bakım ve kozmetik',
    'anne bebek',
    'anne ve bebek',
    'ev yaşam',
    'ev ve yaşam',
    'okul kırtasiye oyuncak',
    'okul kırtasiye ve oyuncak',
    'evcil hayvan',
    'evcil dostlar',
    'çiçek',
    'elektronik',
    'diğer',
];

export function normalizeCategoryNameForOrder(name: string): string {
    return (name || '')
        .toLowerCase()
        .replace(/[&,/]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function categorySortIndex(name: string): number {
    const n = normalizeCategoryNameForOrder(name);
    if (n === 'diğer') return 9999;
    const idx = CATEGORY_ORDER.findIndex((o) => n === o || n.includes(o) || o.includes(n));
    if (idx >= 0) return idx;
    return 5000;
}

/** Kök kategori listesini özel sıraya göre sıralar (yerinde veya yeni dizi). */
export function sortCategoriesByOrder<T extends { name?: string | null }>(categories: T[]): T[] {
    return [...categories].sort((a, b) => {
        const ia = categorySortIndex(a.name || '');
        const ib = categorySortIndex(b.name || '');
        if (ia !== ib) return ia - ib;
        return (a.name || '').localeCompare(b.name || '');
    });
}
