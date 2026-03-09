
import { isProductValid } from '../lib/product-sanity-check';

function runTests() {
    console.log('--- Testing isProductValid Logic ---');

    const cases = [
        { name: 'Zeytinli Açma 90 G', cat: 'Zeytin', expected: false },
        { name: 'Zeytinli Poğaça', cat: 'Zeytin', expected: false },
        { name: 'Marmarabirlik Siyah Zeytin', cat: 'Zeytin', expected: true },
        { name: 'Peynirli Poğaça', cat: 'Peynir', expected: false },
        { name: 'Tavuklu Sandviç', cat: 'Peynir', expected: true } // Should pass Peynir rules? Wait. "Sandviç" not blocked?
    ];

    let passed = 0;
    for (const c of cases) {
        const result = isProductValid(c.name, c.cat, 10);
        const status = result === c.expected ? 'PASS' : 'FAIL';
        console.log(`[${status}] Name: "${c.name}", Cat: "${c.cat}" -> Result: ${result} (Expected: ${c.expected})`);
        if (status === 'PASS') passed++;
    }

    console.log(`\nTests Passed: ${passed}/${cases.length}`);
}

runTests();
