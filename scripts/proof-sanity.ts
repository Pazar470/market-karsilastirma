
import { isProductValid } from '../lib/product-sanity-check';

function proveSanity() {
    console.log('--- Testing Sanity Check Logic ---');

    const testCases = [
        { name: 'Kalpli Anahtarlık', cat: 'Meyve & Sebze', expected: false },
        { name: 'Domates', cat: 'Meyve & Sebze', expected: true },
        { name: 'Teksan Işıldak', cat: 'Meyve & Sebze', expected: false }, // If Migros did this
        { name: 'Piliç But', cat: 'Et & Tavuk', expected: true }, // "Pil" check
        { name: 'Duracell Pil 4lü', cat: 'Meyve & Sebze', expected: false },
        { name: 'Oyuncak Araba', cat: 'Kahvaltılık', expected: false }
    ];

    let passed = 0;
    testCases.forEach(tc => {
        const result = isProductValid(tc.name, tc.cat, 100);
        const icon = result === tc.expected ? '✅' : '❌';
        console.log(`${icon} "${tc.name}" in [${tc.cat}] -> Allowed: ${result} (Expected: ${tc.expected})`);
        if (result === tc.expected) passed++;
    });

    console.log(`\nResult: ${passed}/${testCases.length} Passed.`);
}

proveSanity();
