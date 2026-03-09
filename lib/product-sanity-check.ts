
/**
 * Global Product Sanity Check
 * 
 * This module acts as a "Firewall" for data quality.
 * Markets (especially Şok) sometimes categorize non-food items (Keychains, Toys) into Food categories.
 * This function returns `false` if a product seems misplaced based on its Name vs Category.
 */

export function isProductValid(name: string, categoryPath: string, price: number): boolean {
    // Helper for Turkish Lowercase
    const trLower = (str: string) => str.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();

    const lowerName = trLower(name);
    const lowerCat = trLower(categoryPath);

    // RULE 1: Food Categories vs Non-Food Items
    // Block: Keychains, Toys, Electronics, Batteries, Textiles
    if (
        lowerCat.includes('meyve') ||
        lowerCat.includes('sebze') ||
        lowerCat.includes('gıda') ||
        lowerCat.includes('kahvaltılık') ||
        lowerCat.includes('et') || // broad "Et" matches "Et & Tavuk"
        lowerCat.includes('tavuk') ||
        lowerCat.includes('süt') ||
        lowerCat.includes('ekmek')
    ) {
        const forbiddenTerms = [
            'anahtarlık', 'oyuncak', 'araba', 'bebek', 'toka', 'kılıf',
            'şarj', 'kablo', 'fener', 'ışıldak',
            'çorap', 'atlet', 'külot', 'havlu', 'terlik'
        ];

        // Check standard terms
        if (forbiddenTerms.some(term => lowerName.includes(term))) return false;

        // Special logic for "Pil" (Battery) to avoid "Piliç" (Chicken)
        // We want to block "pil" but allow "Piliç".
        // Strategy: Block "pil" only if it's NOT followed by "iç".
        // Regex: \bpil\b (word boundary) or "pil "
        if (/\bpil\b/.test(lowerName) || lowerName.includes(' pil ')) {
            return false;
        }
        // "Batarya" is safe to ban
        if (lowerName.includes('batarya')) return false;
    }

    // RULE 2: Suspiciously Low Price for Electronics/Textile? 
    // Not implementing yet, strict name matching is safer.

    // RULE 3: Canonical Category Consistency (The "Zeytinli Poğaça" Rule)
    // We ensure that if a product claims to be in a specific essential category, it truly IS that product.

    // PEYNIR (Cheese)
    if (lowerCat.includes('peynir') && !lowerCat.includes('kek')) { // avoid cheesecake category if exists
        const blocked = ['poğaça', 'börek', 'böreği', 'kraker', 'cips', 'bisküvi', 'topkek', 'sos', 'aroma', 'çubuk'];

        // Strict Block for "Kek" to allow "Kekikli" (Thyme)
        if (/\bkek\b/.test(lowerName) || lowerName.includes('cheesecake') || lowerName.includes('pasta')) return false;

        if (blocked.some(b => lowerName.includes(b))) return false;
    }

    // ZEYTIN (Olive)
    // Allow "Ezme" (Paste) as it's olive-derived.
    if (lowerCat.includes('zeytin') && !lowerCat.includes('ezme')) {
        const blocked = ['poğaça', 'açma', 'ekmek', 'ekmeği', 'kraker', 'kek', 'gevrek', 'böreği', 'börek'];

        // Logic for Oil vs Table Olive
        // Block explicitly "Zeytinyağı"
        if (lowerName.includes('zeytinyağı')) return false;

        // Block standalone "Yağ" (Oil) if category is generic Zeytin
        // If it is "Ayçiçek Yağı" inside Zeytin category? (Unlikely but possible)
        // If names contains " yağ " or ends with " yağ"
        if (/\byağ\b/.test(lowerName)) return false;

        if (blocked.some(b => lowerName.includes(b))) {
            // Exception: "Yağlı Sele Zeytin" (Oily Saddle Olive) is OK.
            // We need to be careful with "yağ".
            // If we blocked "yağ" above, we check context.
            // But "Zeytinli" usually implies derivative.
            if (lowerName.includes('zeytinli')) return false; // "Zeytinli" anything is usually a derivative.

            // If name contains blocked words
            if (blocked.some(b => lowerName.includes(b))) return false;
        }
    }

    // SALÇA (Tomato/Pepper Paste)
    if (lowerCat.includes('salça')) {
        const blocked = ['cips', 'sos', 'ketçap', 'mayonez', 'makarna'];
        // "Domates Sosu" acceptable? User wants Salça.
        // If name is just "Domates Sosu", maybe block.
        if (blocked.some(b => lowerName.includes(b))) return false;
    }

    // BEBEK BEZİ (Diapers)
    if (lowerCat.includes('bebek bezi')) {
        const blocked = ['örtü', 'çanta', 'pudra', 'şampuan', 'mendil', 'havlu'];
        // "Islak Mendil" uses "mendil".
        if (blocked.some(b => lowerName.includes(b))) return false;
    }

    return true;
}
