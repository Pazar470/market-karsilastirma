
import { parseUnit } from '../lib/unit-parser';

const tests = [
    "Migros Un 1,5 kg",
    "Pirinç 1.5 kg",
    "Süt 1 L",
    "Ayran 1,5 L",
    "Peynir 500 gr"
];

tests.forEach(t => {
    console.log(`"${t}" =>`, parseUnit(t));
});
