/**
 * Tüm marketlerin kategori zincirlerini (yolları) listeler.
 * Çıktı: docs/KATEGORI-YOLLARI.csv, docs/KATEGORI-YOLLARI-EXCEL.txt (yapıştır için), docs/KATEGORI-YOLLARI.md
 * "Bizim_yaprak_kategori" = getMappedCategory(yaprakAd).canonical. "Ticari_Ad_Ornek" = veritabanından o kategoride bir ürün adı.
 * Kullanım: npx tsx scripts/list-category-paths.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { getMappedCategory } from '../lib/category-mapper';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ROOT = path.join(process.cwd());
const OUT_CSV = path.join(ROOT, 'docs', 'KATEGORI-YOLLARI.csv');
const OUT_TSV = path.join(ROOT, 'docs', 'KATEGORI-YOLLARI-EXCEL.txt'); // Tab ile ayrılmış → Excel'e yapıştırınca sütunlar hazır
const OUT_MD = path.join(ROOT, 'docs', 'KATEGORI-YOLLARI.md');

interface Cat { id?: string | number; name: string; path: string; prettyName?: string; url?: string }

function load(name: string): Cat[] {
  const file = path.join(ROOT, `${name}_categories.json`);
  if (!fs.existsSync(file)) return [];
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  return data.categories || data || [];
}

function escapeCsv(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Tab/newline içeren değerleri boşlukla değiştir ki Excel'de tek hücrede kalsın */
function forPaste(s: string): string {
  return s.replace(/\t/g, ' ').replace(/[\n\r]+/g, ' ').trim();
}

/** Veritabanından (market, canonical) başına bir örnek ürün adı map'i döner. DB yoksa/boşsa boş obje. */
async function buildSampleProductMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const products = await prisma.product.findMany({
      select: { name: true, tags: true, prices: { select: { market: { select: { name: true } } } } }
    });
    for (const p of products) {
      let canonical = '';
      try {
        const tags = p.tags ? JSON.parse(p.tags) : [];
        canonical = Array.isArray(tags) && tags[0] ? String(tags[0]).trim() : '';
      } catch {
        canonical = '';
      }
      if (!canonical) continue;
      for (const pr of p.prices) {
        const marketName = pr.market?.name;
        if (!marketName) continue;
        const key = `${marketName}|${canonical}`;
        if (!map.has(key)) map.set(key, p.name);
      }
    }
  } catch (_) {
    // DB yok veya boş
  }
  return map;
}

async function main() {
  const migros = load('migros') as Cat[];
  const a101 = load('a101') as Cat[];
  const sok = load('sok') as Cat[];

  const rows: { market: string; path: string; name: string; code: string }[] = [];

  for (const c of migros) {
    rows.push({
      market: 'Migros',
      path: c.path || c.name,
      name: c.name,
      code: String(c.prettyName ?? c.id ?? '')
    });
  }
  for (const c of a101) {
    rows.push({
      market: 'A101',
      path: c.path || c.name,
      name: c.name,
      code: String(c.id ?? '')
    });
  }
  for (const c of sok) {
    rows.push({
      market: 'Şok',
      path: c.path || c.name,
      name: c.name,
      code: String(c.id ?? '')
    });
  }

  // CSV (Excel için; UTF-8 BOM)
  const bom = '\uFEFF';
  const header = 'Market;Kategori_Zinciri;Yaprak_Ad;Kod';
  const csvLines = [bom + header, ...rows.map(r => [r.market, r.path, r.name, r.code].map(escapeCsv).join(';'))];
  fs.mkdirSync(path.dirname(OUT_CSV), { recursive: true });
  fs.writeFileSync(OUT_CSV, csvLines.join('\n'), 'utf-8');
  console.log(`CSV: ${OUT_CSV} (${rows.length} satır)`);

  // Örnek ürün adları: (market, canonical) -> bir ürün ismi
  const sampleMap = await buildSampleProductMap();

  // Tab ile ayrılmış. Sütunlar: ... + Ticari_Ad_Ornek + Bizim_yaprak_kategori + Bizim_ana_kategori (boş)
  const tab = '\t';
  const tsvHeader = ['Market', 'Kategori_Zinciri', 'Yaprak_Ad', 'Kod', 'Ticari_Ad_Ornek', 'Bizim_yaprak_kategori', 'Bizim_ana_kategori'].join(tab);
  const tsvContent = [
    tsvHeader,
    ...rows.map(r => {
      const { canonical } = getMappedCategory(r.name, '');
      const sampleName = sampleMap.get(`${r.market}|${canonical}`) ?? '';
      return [
        r.market,
        forPaste(r.path),
        forPaste(r.name),
        r.code,
        forPaste(sampleName),
        canonical,
        '' // Bizim_ana_kategori: boş, kullanıcı dolduracak
      ].join(tab);
    })
  ].join('\r\n');
  const utf16Bom = Buffer.from([0xff, 0xfe]);
  const utf16Body = Buffer.from(tsvContent, 'utf16le');
  fs.writeFileSync(OUT_TSV, Buffer.concat([utf16Bom, utf16Body]));
  console.log(`TSV: ${OUT_TSV} (${rows.length} satır, UTF-16 LE) → Sütunlar: + Ticari_Ad_Ornek, + Bizim_ana_kategori (boş).`);

  // Markdown: market bazlı listeler
  const byMarket: Record<string, { path: string; name: string; code: string }[]> = { Migros: [], A101: [], Şok: [] };
  for (const r of rows) byMarket[r.market].push({ path: r.path, name: r.name, code: r.code });

  const md: string[] = [
    '# Kategori yolları (zincirler) – tüm marketler',
    '',
    'Eşleştirme tablosu yapmak için kullan. CSV: `docs/KATEGORI-YOLLARI.csv` (Excel’de aç; ayırıcı olarak **;** seç).',
    '',
    '---',
    ''
  ];

  for (const [market, list] of Object.entries(byMarket)) {
    md.push(`## ${market} (${list.length} yaprak kategori)`);
    md.push('');
    md.push('| Kategori zinciri | Yaprak ad | Kod |');
    md.push('|------------------|-----------|-----|');
    for (const { path: p, name, code } of list) {
      md.push(`| ${p.replace(/\|/g, '\\|')} | ${name.replace(/\|/g, '\\|')} | ${code} |`);
    }
    md.push('');
  }

  fs.writeFileSync(OUT_MD, md.join('\n'), 'utf-8');
  console.log(`MD:  ${OUT_MD}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
