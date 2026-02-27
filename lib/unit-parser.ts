export function parseUnit(name: string) {
    const lower = name.toLowerCase()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c');

    // Regex to capture amount and unit (e.g. 500 g, 1 kg, 6x200 ml, 350 (implicit g))
    // Added support for case-insensitive 'Kg' at end, and bare numbers for specific contexts (handled loosely here)
    // Regex to capture amount and unit (e.g. 500 g, 1.5 kg, 1,5 kg, 6x200 ml)
    const quantityRegex = /(\d+(?:[.,]\d+)?)\s*(?:x\s*(\d+(?:[.,]\d+)?))?\s*(')?\s*(kg|gr|g|gram|litre|lt|l|ml|cl|adet|li|lu|lü|ad)\b/i;

    // Check for "Kg" at end of string acting as "1 Kg" e.g. "Kelle Kaşar Kg"
    // Check for "Kg" at end of string acting as "1 Kg" e.g. "Kelle Kaşar Kg"
    // BUT be careful: "1.5 kg" also ends with "kg". We must ensure it's NOT preceded by a number.
    if (lower.endsWith(' kg') && !/\d\s*kg$/.test(lower)) {
        return { amount: 1, unit: 'kg' };
    }

    // Find all matches, take the last one as it's usually the size
    const matches = lower.match(new RegExp(quantityRegex, 'g'));

    if (matches && matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        const parts = lastMatch.match(quantityRegex);

        if (parts) {
            let amount1 = parseFloat(parts[1].replace(',', '.'));
            let amount2 = parts[2] ? parseFloat(parts[2].replace(',', '.')) : 1;
            let unit = parts[4].toLowerCase();

            // Special Case: "12'li Boya", "24'lü Kalem" -> These are SETS, not units.
            // If unit looks like 'li', 'lu' AND context implies stationery/electronics, force amount to 1.
            const isCountUnit = ['adet', 'li', 'lu', 'lü', 'ad'].includes(unit);
            const isNonConsumableContext = /boya|kalem|renk|set|fırça|pil|ampul|silgi|defter/i.test(lower);

            if (isCountUnit && isNonConsumableContext) {
                // Return 1 ad (1 set)
                return { amount: 1, unit: 'ad' };
            }

            let totalAmount = amount1 * amount2;

            // Normalize
            if (['gr', 'g', 'gram'].includes(unit)) {
                unit = 'kg';
                totalAmount = totalAmount / 1000;
            } else if (['ml', 'cl'].includes(unit)) {
                unit = 'l';
                if (unit === 'cl') totalAmount = totalAmount / 100;
                else totalAmount = totalAmount / 1000;
            } else if (['litre', 'lt'].includes(unit)) {
                unit = 'l';
            } else if (isCountUnit) {
                unit = 'ad';
            }

            return { amount: totalAmount, unit: unit };
        }
    }

    // Fallback: Look for bare 3-4 digit numbers if explicit unit failed.
    // Usually cheese/meat at 200-999 is grams.
    // DANGEROUS: Might match "2024" year or "300" model number.
    // Heuristic: If it looks like a standard weight (100, 200, 250, 350, 400, 500, 600, 700, 750, 800, 900)
    const bareNumberMatch = name.match(/\b(100|125|150|180|200|250|300|350|400|450|500|600|700|750|800|900|1000)\b(?!\s*(?:tl|adet|li|lu))/i);
    if (bareNumberMatch) {
        // Anti-pattern: If title contains "Watt", "Lümen", "Ampul", "Led", "Pil", "Boya", "Kalem", ignore gram guess
        if (/watt|lumen|lümen|ampul|led|pil|boya|kalem/i.test(lower)) {
            return { amount: 1, unit: 'ad' };
        }
        // Assume grams
        return { amount: parseFloat(bareNumberMatch[1]) / 1000, unit: 'kg' };
    }

    return null;
}
