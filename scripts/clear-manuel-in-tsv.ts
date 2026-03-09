/**
 * TSV'de belirtilen (market, kategori kodu) satırlarında Manuel sütununu boşaltır.
 * Böylece import-only-mapping-manuel tekrar çalıştırılsa bu kod manuel listesine eklenmez.
 * Çalıştırma: npx tsx scripts/clear-manuel-in-tsv.ts "docs/tum_urunler_manuel_with_ids.tsv" Migros "otlar-yesillikler-c-3f5"
 */
import * as fs from 'fs';
import * as path from 'path';

function main() {
    const tsvPath = process.argv[2] || path.join(process.cwd(), 'docs', 'tum_urunler_manuel_with_ids.tsv');
    const marketName = process.argv[3];
    const marketCode = process.argv[4];
    if (!marketName || !marketCode) {
        console.error('Kullanım: npx tsx scripts/clear-manuel-in-tsv.ts <tsv> <marketName> <marketCategoryCode>');
        process.exit(1);
    }
    const filePath = path.resolve(process.cwd(), tsvPath);
    if (!fs.existsSync(filePath)) {
        console.error('Dosya bulunamadı:', filePath);
        process.exit(1);
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    let count = 0;
    const out = lines.map((line, i) => {
        if (i === 0) return line; // header
        const parts = line.split('\t');
        if (parts[0] === marketName && parts[1] === marketCode && (parts[7] ?? '').trim() !== '') {
            parts[7] = '';
            count++;
            return parts.join('\t');
        }
        return line;
    });
    fs.writeFileSync(filePath, out.join('\n'), 'utf-8');
    console.log('Manuel sütunu temizlendi:', count, 'satır');
}

main();
