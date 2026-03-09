/**
 * sok_active_urls.txt içine yapıştırdığınız Şok kategori URL'lerini okur,
 * her birinden kategori id (-c-XXXX) ve base URL çıkarır, sok_active_urls.json'ı günceller.
 *
 * Kullanım:
 *   1. sok_active_urls.txt dosyasına her satıra bir URL yapıştırın (örn. ...?page=13 dahil olabilir).
 *   2. npx ts-node --esm scripts/update-sok-active-urls.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const TXT = path.join(ROOT, 'sok_active_urls.txt');
const JSON_FILE = path.join(ROOT, 'sok_active_urls.json');

const URL_ID_REGEX = /-c-(\d+)(?:\?|$|\/)/;

function extractIdAndBaseUrl(line: string): { id: string; base: string } | null {
  const url = line.trim();
  if (!url || url.startsWith('#')) return null;
  const base = url.replace(/\?.*$/, '');
  const m = base.match(URL_ID_REGEX);
  if (!m) return null;
  return { id: m[1], base };
}

function main() {
  let existing: Record<string, string> = {};
  if (fs.existsSync(JSON_FILE)) {
    const raw = fs.readFileSync(JSON_FILE, 'utf-8');
    const data = JSON.parse(raw);
    Object.keys(data).forEach(k => {
      if (k.startsWith('_')) return;
      existing[k] = data[k];
    });
  }

  if (!fs.existsSync(TXT)) {
    fs.writeFileSync(
      TXT,
      '# Her satıra bir Şok kategori URL\'si yapıştırın. ?page=13 gibi parametreler otomatik temizlenir.\n# Örnek:\n# https://www.sokmarket.com.tr/yemeklik-malzemeler-c-1770?page=13\n',
      'utf-8'
    );
    console.log('sok_active_urls.txt oluşturuldu. URL\'leri oraya yapıştırıp scripti tekrar çalıştırın.');
    return;
  }

  const lines = fs.readFileSync(TXT, 'utf-8').split(/\r?\n/);
  const updated = { ...existing };
  let added = 0;
  for (const line of lines) {
    const parsed = extractIdAndBaseUrl(line);
    if (!parsed) continue;
    if (updated[parsed.id] !== parsed.base) {
      updated[parsed.id] = parsed.base;
      added++;
    }
  }

  const out: Record<string, string> = {
    _aciklama: "Şok kategori base URL'leri (id -> url). Taramada bu URL'ler öncelikli kullanılır."
  };
  Object.keys(updated)
    .filter(k => !k.startsWith('_'))
    .sort((a, b) => Number(a) - Number(b))
    .forEach(id => { out[id] = updated[id]; });

  fs.writeFileSync(JSON_FILE, JSON.stringify(out, null, 2), 'utf-8');
  console.log(`sok_active_urls.json güncellendi. ${Object.keys(out).filter(k => !k.startsWith('_')).length} kategori, bu çalıştırmada ${added} eklendi/güncellendi.`);
}

main();
