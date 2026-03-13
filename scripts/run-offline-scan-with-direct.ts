/**
 * Günlük offline taramayı DIRECT_DATABASE_URL ile çalıştırır (direct connection).
 * Pooler (DATABASE_URL) uzun süren taramada gerekmez; direct daha uygun.
 *
 * Kullanım: npx tsx scripts/run-offline-scan-with-direct.ts
 * .env'de DIRECT_DATABASE_URL tanımlı olmalı (Supabase → Direct connection, port 5432).
 */
import 'dotenv/config';

const direct = process.env.DIRECT_DATABASE_URL;
if (direct) {
    process.env.DATABASE_URL = direct;
}

// DATABASE_URL artık direct; sonraki import'lar (scraper, db-utils, run-full-scan-offline) bu URL ile bağlanır
await import('./run-full-scan-offline.ts');
