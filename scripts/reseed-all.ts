
import { execSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCRIPTS_DIR = __dirname;
// Define scripts in order
const SCRIPTS = [
    'wipe-db.ts', // ENABLED: Fresh Start requested by User
    'seed-migros-api.ts', // Use API version for better paths
    'seed-a101.ts',   // A101 updated valid logic
    'seed-sok.ts',    // Şok updated dynamic logic
    'map-categories.ts' // Final mapping
];

console.log('🚀 STARTING FULL RESEED SEQUENCE 🚀');

for (const script of SCRIPTS) {
    console.log(`\n----------------------------------------`);
    console.log(`▶ RUNNING: ${script}`);
    console.log(`----------------------------------------`);
    try {
        const cmd = `npx tsx ${path.join(SCRIPTS_DIR, script)}`;
        // stdio: 'inherit' prints output to console in real-time
        execSync(cmd, { stdio: 'inherit', cwd: path.join(SCRIPTS_DIR, '..') });
        console.log(`✔ SUCCESS: ${script}`);
    } catch (e) {
        console.error(`❌ FAILED: ${script}`);
        console.error('Stopping sequence due to error.');
        process.exit(1);
    }
}

console.log(`\n✅✅✅ FULL SEQUENCE COMPLETED SUCCESSFULLY ✅✅✅`);
