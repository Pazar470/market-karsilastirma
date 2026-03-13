/**
 * Prisma migration'ı DIRECT_DATABASE_URL ile çalıştırır (direct connection, pooler değil).
 * Kullanım: node scripts/migrate-with-direct.cjs
 * .env'de DIRECT_DATABASE_URL tanımlı olmalı (Supabase → Direct connection, port 5432).
 */
require('dotenv').config({ path: '.env' });

const direct = process.env.DIRECT_DATABASE_URL;
if (!direct) {
    console.error('Hata: DIRECT_DATABASE_URL .env içinde tanımlı değil. Supabase → Direct connection URL ekleyin.');
    process.exit(1);
}

process.env.DATABASE_URL = direct;
const { execSync } = require('child_process');
execSync('npx prisma migrate deploy', { stdio: 'inherit' });
