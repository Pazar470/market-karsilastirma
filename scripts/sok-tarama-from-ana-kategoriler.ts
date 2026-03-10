/**
 * Şok tarama CLI: Kategori keşfi + "verilmeyen ana kategoriler" raporu.
 * Keşif aslı lib/sok-category-discovery.ts içinde; offline tarama Şok'tan önce otomatik çağırır.
 * Kullanım: npx tsx scripts/sok-tarama-from-ana-kategoriler.ts
 */
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { runSokCategoryDiscovery } from '../lib/sok-category-discovery';

function normalizeCategoryUrl(href: string): string {
  if (href.startsWith('http')) return href.split('?')[0];
  return `https://www.sokmarket.com.tr${href.startsWith('/') ? href : '/' + href}`.split('?')[0];
}

function categoryIdFromUrl(url: string): string | null {
  const m = url.match(/-c-(\d+)/);
  return m ? m[1] : null;
}

async function main() {
  await runSokCategoryDiscovery({ silent: false });

  // CLI: Ana sayfada görünüp config'te olmayan ana kategorileri raporla
  const configPath = path.join(process.cwd(), 'scripts', 'sok-tarama-config.json');
  let mainCategoryUrls: string[] = [];
  if (fs.existsSync(configPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      mainCategoryUrls = Array.isArray(raw.mainCategoryUrls) ? raw.mainCategoryUrls : [];
    } catch (_) {}
  }
  const userMainIds = new Set(mainCategoryUrls.map((u) => categoryIdFromUrl(u)).filter((id): id is string => !!id));
  const anaSayfaUrl = 'https://www.sokmarket.com.tr/';
  if (userMainIds.size === 0 || !anaSayfaUrl) return;

  try {
    const res = await fetch(anaSayfaUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' },
    });
    if (!res.ok) return;
    const html = await res.text();
    const $ = cheerio.load(html);
    const anaSayfaLinks: { id: string; name: string; url: string }[] = [];
    $('a[href*="-c-"]').each((_, el) => {
      const href = $(el).attr('href');
      const name = $(el).text().trim();
      if (!href || !name || name.length > 150) return;
      const fullUrl = normalizeCategoryUrl(href);
      const id = categoryIdFromUrl(fullUrl);
      if (!id || anaSayfaLinks.some((l) => l.id === id)) return;
      anaSayfaLinks.push({ id, name, url: fullUrl });
    });
    const missingLinks = anaSayfaLinks.filter((l) => !userMainIds.has(l.id));
    if (missingLinks.length === 0) {
      console.log('\nAna sayfadaki tüm ana kategoriler listende mevcut.');
    } else {
      console.log(`\nListende olmayan ${missingLinks.length} ana kategori:`, missingLinks.map((m) => m.name).join(', '));
    }
  } catch (e) {
    console.error('Ana sayfa raporu hatası:', e);
  }
}

main();
