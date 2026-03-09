/**
 * Tatbikat – silme sonrası: Sen veriyi elle sildikten sonra bunu çalıştır.
 * ODS import → Tam tarama (mapping senkronu otomatik).
 *
 * Çalıştırma: npx tsx scripts/run-tatbikat-after-reset.ts
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ODS_PATH = path.join(process.cwd(), 'docs', 'tum_urunler_manuel.ods');

// Supabase max clients için tek bağlantı kullan (child process'ler bu env'i alır)
function setConnectionLimit() {
    const url = process.env.DATABASE_URL;
    if (url && !url.includes('connection_limit')) {
        process.env.DATABASE_URL = url.includes('?')
            ? url.replace('?', '?connection_limit=1&')
            : url + '?connection_limit=1';
    }
}

function main() {
    setConnectionLimit();
    console.log('=== TATBİKAT (ODS import → tam tarama) ===\n');
    const start = Date.now();

    if (!fs.existsSync(ODS_PATH)) {
        console.error('ODS dosyası bulunamadı:', ODS_PATH);
        process.exit(1);
    }

    // Veriyi sen sildiğin için temizlik atlanıyor; sadece import (Category + Mapping + Manuel)
    console.log('1/2 ODS import…\n');
    execSync(`npx tsx scripts/import-category-from-tsv.ts "${ODS_PATH}"`, {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: { ...process.env },
    });

    console.log('\n2/2 Tam tarama (indirme → upload → mapping senkronu → alarm)…\n');
    execSync('npx tsx scripts/run-full-scan-offline.ts', {
        stdio: 'inherit',
        cwd: process.cwd(),
        timeout: 45 * 60 * 1000,
    });

    const elapsed = ((Date.now() - start) / 1000 / 60).toFixed(1);
    console.log('\n=== BİTTİ ===');
    console.log('Süre:', elapsed, 'dakika');
    console.log('Rapor: scrape-offline-report.txt');
}

main();
