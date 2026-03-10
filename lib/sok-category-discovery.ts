/**
 * Şok kategori keşfi: 19 ana kategori + ana sayfa URL ile alt kategorileri çeker,
 * sok_categories.json yazar. Offline tarama ve cron Şok'tan önce bu modülü çağırır.
 */
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const BASE = 'https://www.sokmarket.com.tr';
const FETCH_DELAY_MS = 250;

const DEFAULT_ANA_SAYFA_URL = 'https://www.sokmarket.com.tr/';
const DEFAULT_MAIN_CATEGORY_URLS = [
  'https://www.sokmarket.com.tr/yemeklik-malzemeler-c-1770',
  'https://www.sokmarket.com.tr/et-ve-tavuk-ve-sarkuteri-c-160',
  'https://www.sokmarket.com.tr/meyve-ve-sebze-c-20',
  'https://www.sokmarket.com.tr/sut-ve-sut-urunleri-c-460',
  'https://www.sokmarket.com.tr/kahvaltilik-c-890',
  'https://www.sokmarket.com.tr/atistirmaliklar-c-20376',
  'https://www.sokmarket.com.tr/icecek-c-20505',
  'https://www.sokmarket.com.tr/ekmek-ve-pastane-c-1250',
  'https://www.sokmarket.com.tr/dondurulmus-urunler-c-1550',
  'https://www.sokmarket.com.tr/dondurma-c-31102',
  'https://www.sokmarket.com.tr/temizlik-c-20647',
  'https://www.sokmarket.com.tr/kagit-urunler-c-20875',
  'https://www.sokmarket.com.tr/kisisel-bakim-ve-kozmetik-c-20395',
  'https://www.sokmarket.com.tr/anne-bebek-ve-cocuk-c-20634',
  'https://www.sokmarket.com.tr/oyuncak-c-20644',
  'https://www.sokmarket.com.tr/ev-ve-yasam-c-20898',
  'https://www.sokmarket.com.tr/evcil-dostlar-c-20880',
  'https://www.sokmarket.com.tr/giyim-ayakkabi-ve-aksesuar-c-20886',
  'https://www.sokmarket.com.tr/elektronik-c-22769',
];

export type SokCategory = { id: string; code: string; name: string; path: string; url: string };

interface Config {
  mainCategoryUrls: string[];
  anaSayfaUrl?: string;
}

function loadConfig(): Config {
  const configPath = path.join(process.cwd(), 'scripts', 'sok-tarama-config.json');
  let mainCategoryUrls = DEFAULT_MAIN_CATEGORY_URLS;
  let anaSayfaUrl: string | undefined = DEFAULT_ANA_SAYFA_URL;
  if (fs.existsSync(configPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (Array.isArray(raw.mainCategoryUrls) && raw.mainCategoryUrls.length > 0) {
        mainCategoryUrls = raw.mainCategoryUrls.map((u: string) => String(u).trim()).filter(Boolean);
      }
      if (raw.anaSayfaUrl) anaSayfaUrl = String(raw.anaSayfaUrl).trim();
    } catch (_) {}
  }
  return { mainCategoryUrls, anaSayfaUrl };
}

function categoryIdFromUrl(url: string): string | null {
  const m = url.match(/-c-(\d+)/);
  return m ? m[1] : null;
}

function slugFromUrl(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : BASE + url);
    const seg = u.pathname.replace(/^\//, '').replace(/\/$/, '');
    return seg || '';
  } catch {
    return url.replace(/.*\/([^/]+)$/, '$1') || url;
  }
}

function normalizeCategoryUrl(href: string): string {
  if (href.startsWith('http')) return href.split('?')[0];
  const pathPart = href.startsWith('/') ? href : `/${href}`;
  return `${BASE}${pathPart}`.split('?')[0];
}

function parseSubcategoriesFromHtml(
  mainUrl: string,
  parentName: string,
  $: ReturnType<typeof cheerio.load>,
  mainCategoryIds: Set<string>
): SokCategory[] {
  const subs: SokCategory[] = [];
  const seen = new Set<string>();
  const parentId = categoryIdFromUrl(mainUrl);
  if (!parentId) return subs;
  $('a[href*="-c-"]').each((_, el) => {
    const href = $(el).attr('href');
    const name = $(el).text().trim();
    if (!href || !name || name.length > 200) return;
    const fullUrl = normalizeCategoryUrl(href);
    const id = categoryIdFromUrl(fullUrl);
    if (!id || id === parentId || fullUrl === mainUrl || mainCategoryIds.has(id) || seen.has(fullUrl)) return;
    seen.add(fullUrl);
    subs.push({
      id,
      code: slugFromUrl(fullUrl),
      name,
      path: `${parentName} > ${name}`,
      url: fullUrl,
    });
  });
  return subs;
}

function getParentNameFromHtml(html: string, $: ReturnType<typeof cheerio.load>, fallbackUrl: string): string {
  const h1 = $('h1').first().text().trim();
  if (h1 && h1.length < 100) return h1;
  const title = $('title').text().trim();
  const m = title.match(/^(.+?)\s*[-|]\s*Cepte Şok/i);
  if (m && m[1].trim().length < 100) return m[1].trim();
  const slug = slugFromUrl(fallbackUrl);
  return slug.replace(/-c-\d+$/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

async function discoverMainCategoryIds(anaSayfaUrl: string): Promise<Set<string>> {
  const ids = new Set<string>();
  try {
    const res = await fetch(anaSayfaUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' },
    });
    if (!res.ok) return ids;
    const html = await res.text();
    const $ = cheerio.load(html);
    $('a[href*="-c-"]').each((_, el) => {
      const href = $(el).attr('href');
      const id = categoryIdFromUrl(normalizeCategoryUrl(href || ''));
      if (id) ids.add(id);
    });
  } catch (_) {}
  return ids;
}

export type SokCategoryDiscoveryOptions = { silent?: boolean };

/**
 * 19 ana kategori + ana sayfa ile sok_categories.json üretir. Şok taramasından önce otomatik çağrılır.
 */
export async function runSokCategoryDiscovery(opts?: SokCategoryDiscoveryOptions): Promise<void> {
  const silent = opts?.silent ?? false;
  const config = loadConfig();
  if (!silent) console.log('Şok kategori keşfi:', config.mainCategoryUrls.length, 'ana kategori');

  const userMainIds = new Set(config.mainCategoryUrls.map((u) => categoryIdFromUrl(u)).filter((id): id is string => !!id));
  const anaUrl = config.anaSayfaUrl || BASE + '/';
  const fromAna = await discoverMainCategoryIds(anaUrl);
  const allMainCategoryIds = new Set([...userMainIds, ...fromAna]);
  await new Promise((r) => setTimeout(r, FETCH_DELAY_MS));

  const allSubs: SokCategory[] = [];
  const seenUrls = new Set<string>();

  for (const mainUrl of config.mainCategoryUrls) {
    const mainId = categoryIdFromUrl(mainUrl);
    if (!mainId) continue;
    try {
      const res = await fetch(mainUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' },
      });
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, FETCH_DELAY_MS));
        continue;
      }
      const html = await res.text();
      const $ = cheerio.load(html);
      const parentName = getParentNameFromHtml(html, $, mainUrl);
      const subs = parseSubcategoriesFromHtml(mainUrl, parentName, $, allMainCategoryIds);
      for (const sub of subs) {
        if (!seenUrls.has(sub.url)) {
          seenUrls.add(sub.url);
          allSubs.push(sub);
        }
      }
    } catch (_) {}
    await new Promise((r) => setTimeout(r, FETCH_DELAY_MS));
  }

  const output = { market: 'Şok', totalLeafCategories: allSubs.length, categories: allSubs };
  const outPath = path.join(process.cwd(), 'sok_categories.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  if (!silent) console.log('Şok:', allSubs.length, 'yaprak kategori → sok_categories.json');
}
