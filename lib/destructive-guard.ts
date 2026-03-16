/**
 * Production (Supabase) veritabanında silme / toplu temizlik yapan scriptlerin
 * yanlışlıkla çalışmasını engellemek için kullanılır.
 *
 * Kullanım: Script'in main() başında requireDestructiveConfirm() çağır.
 * Prod'a yazacaksan: CONFIRM_DESTROY_PROD=1 environment ile çalıştır.
 */

const DATABASE_URL = process.env.DATABASE_URL ?? '';

function looksLikeProduction(): boolean {
  const u = DATABASE_URL.toLowerCase();
  return u.includes('supabase') || u.includes('pooler') || u.includes('aws-');
}

export function requireDestructiveConfirm(scriptName: string): void {
  if (!looksLikeProduction()) return;
  if (process.env.CONFIRM_DESTROY_PROD === '1') return;

  console.error('');
  console.error('❌ Bu script production veritabanında (Supabase) silme / toplu temizlik yapar.');
  console.error(`   Script: ${scriptName}`);
  console.error('   DATABASE_URL production gibi görünüyor. Çalıştırmak için:');
  console.error('   CONFIRM_DESTROY_PROD=1 npx tsx ' + scriptName);
  console.error('');
  process.exit(1);
}
