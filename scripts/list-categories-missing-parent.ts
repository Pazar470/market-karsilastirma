/**
 * Category_backup.csv içinde parent'ı CSV'de bulunmayan (veya sıra dışı kalan) kategorileri listeler.
 * Çalıştırma: npx tsx scripts/list-categories-missing-parent.ts
 */

import fs from 'fs';
import path from 'path';
import { parseCsvLine } from '../lib/csv-parse';

const SEED_DIR = path.join(process.cwd(), 'prisma', 'seed-data');
const filePath = path.join(SEED_DIR, 'Category_backup.csv');

const raw = fs.readFileSync(filePath, 'utf8');
const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
if (lines.length <= 1) {
  console.log('CSV boş veya sadece header.');
  process.exit(0);
}

type Row = { id: string; name: string; slug: string; parentId: string | null };
const byId = new Map<string, Row>();

for (let i = 1; i < lines.length; i++) {
  const cols = parseCsvLine(lines[i]);
  if (cols.length < 4) continue;
  const [id, name, slug, parentId] = cols;
  if (!id || !name || !slug) continue;
  byId.set(id, { id, name, slug, parentId: parentId?.trim() || null });
}

const inserted = new Set<string>();
const sorted: Row[] = [];
while (sorted.length < byId.size) {
  let added = 0;
  for (const row of byId.values()) {
    if (inserted.has(row.id)) continue;
    if (row.parentId && !inserted.has(row.parentId)) continue;
    sorted.push(row);
    inserted.add(row.id);
    added++;
  }
  if (added === 0) break;
}

const remaining = [...byId.values()].filter((r) => !inserted.has(r.id));

console.log('# Parent\'ı CSV\'de olmayan / sıra dışı kalan kategoriler (' + remaining.length + ' adet)\n');
console.log('| # | name | slug | parentId (CSV\'de yok) |');
console.log('|---|------|------|----------------------|');
remaining.forEach((r, i) => {
  console.log('| ' + (i + 1) + ' | ' + r.name + ' | ' + r.slug + ' | ' + (r.parentId || '') + ' |');
});
