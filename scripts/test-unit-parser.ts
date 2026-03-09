
import { parseUnit } from '../lib/unit-parser';

const testCases = [
    "Domates Kg",
    "Kokteyl Domates Kg",
    "Salkım Domates Kg",
    "Hasmandıra Kelle Kaşar Kg",
    "Tahsilatdaroğlu Eski Kaşar Peyniri 350 (İnek Sütü)",
    "Domates", // Should be null?
    "Domates 1 Kg",
    "Domates 500 gr"
];

console.log("Testing Unit Parser:");
testCases.forEach(name => {
    console.log(`"${name}" ->`, parseUnit(name));
});
