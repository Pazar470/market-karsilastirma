/**
 * Tek seferlik: DB temizle, sadece A101 tara, sonuç özeti ver.
 * A101 öne alınmış tarama sonucunu hızlı görmek için.
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import fetch from 'node-fetch';
import { upsertProduct } from '../lib/db-utils';
import { parseQuantity } from '../lib/utils';

const prisma = new PrismaClient();

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Content-Type': 'application/json',
    Origin: 'https://www.a101.com.tr',
    Referer: 'https://www.a101.com.tr/kapida',
};

function a101ParentId(leafId: string): string {
    return leafId.slice(0, 3);
}

async function findCategoryId(categoryPath: string, marketName: string): Promise<string | undefined> {
    const pathParts = categoryPath.split(' > ');
    const leafName = pathParts[pathParts.length - 1].trim();
    const slug = leafName.toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '')
        + `-${marketName.toLowerCase()}`;
    const cat = await prisma.category.findUnique({ where: { slug } });
    return cat?.id;
}

async function scrapeA101ByParent(
    parentId: string,
    leafCategories: { id: string; name: string; path: string }[],
    market: any
) {
    const url = `https://rio.a101.com.tr/dbmk89vnr/CALL/Store/getProductsByCategory/VS032?id=${parentId}&channel=SLOT&__culture=tr-TR&__platform=web&data=e30%3D&__isbase64=true`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
        console.warn(`[A101] HTTP ${res.status} parent ${parentId}`);
        return 0;
    }
    const data: any = await res.json();
    let items: any[] = [];
    if (data.data && Array.isArray(data.data)) items.push(...data.data);
    if (data.children && Array.isArray(data.children)) {
        for (const child of data.children) {
            if (child.products && Array.isArray(child.products)) items.push(...child.products);
        }
    }
    const leafIds = new Set(leafCategories.map(c => c.id));
    const leafMap = Object.fromEntries(leafCategories.map(c => [c.id, c]));
    let count = 0;
    for (const item of items) {
        const name = item.attributes?.name || item.name || '';
        const rawPrice = item.price?.discounted || item.price?.normal || 0;
        const price = rawPrice / 100;
        if (!name || price <= 0) continue;
        const productCatIds = (item.categories || []).map((c: any) => c.id).filter(Boolean);
        const matchedLeafId = productCatIds.find((id: string) => leafIds.has(id));
        if (!matchedLeafId) continue;
        const leaf = leafMap[matchedLeafId];
        const dbCategoryId = await findCategoryId(leaf.path, 'A101');
        const qty = parseQuantity(name);
        const unwantedImg = ['yerli', 'dondurulmus', 'donuk', 'badge', 'yerliuretim', 'donukurun', 'glutensiz', 'vegan', 'helal'];
        const imgArr = item.images || [];
        const validImg = imgArr.find((im: any) => im?.url && !unwantedImg.some(kw => (im.url || '').toLowerCase().includes(kw)));
        const img = (validImg?.url || imgArr[0]?.url || '').trim();
        const link = `https://www.a101.com.tr/kapida/u/${item.url || item.id}`;
        await upsertProduct({
            name,
            price,
            imageUrl: img.startsWith('http') ? img : `https://cdn2.a101.com.tr${img}`,
            link,
            store: 'A101',
            categoryCode: leaf.id,
            categoryName: leaf.name,
            quantityAmount: qty.amount || undefined,
            quantityUnit: qty.unit || undefined
        }, market.id, dbCategoryId);
        count++;
    }
    return count;
}

async function main() {
    console.log('Veritabanı temizleniyor...');
    await prisma.price.deleteMany({});
    await prisma.product.deleteMany({});

    const market = await prisma.market.upsert({
        where: { name: 'A101' },
        update: {},
        create: { name: 'A101', url: 'https://www.a101.com.tr/kapida' }
    });

    const a101Cats = JSON.parse(fs.readFileSync('a101_categories.json', 'utf-8')).categories;
    const byParent = new Map<string, { id: string; name: string; path: string }[]>();
    for (const cat of a101Cats) {
        const pid = a101ParentId(cat.id);
        if (!byParent.has(pid)) byParent.set(pid, []);
        byParent.get(pid)!.push({ id: cat.id, name: cat.name, path: cat.path });
    }

    console.log(`A101 taranıyor: ${byParent.size} parent, ${a101Cats.length} yaprak...`);
    let total = 0;
    for (const [parentId, leaves] of byParent) {
        const n = await scrapeA101ByParent(parentId, leaves, market);
        total += n;
        if (n > 0) process.stdout.write(`.`);
    }
    console.log(`\nToplam A101 ürün: ${total}`);

    // Özet: kategori (tags[0] veya category) bazında ürün sayıları
    const products = await prisma.product.findMany({
        include: { prices: { where: { marketId: market.id } } },
        where: { prices: { some: { marketId: market.id } } }
    });
    const byCategory: Record<string, number> = {};
    const byAna: Record<string, number> = {};
    for (const p of products) {
        let tags: string[] = [];
        try {
            tags = p.tags ? JSON.parse(p.tags) : [];
        } catch (_) {}
        const canonical = (tags[0] || p.category || 'Diğer') as string;
        byCategory[canonical] = (byCategory[canonical] || 0) + 1;
        const ana = p.category || 'Diğer';
        byAna[ana] = (byAna[ana] || 0) + 1;
    }
    console.log('\n--- Yaprak (canonical) bazında ürün sayısı (ilk 20) ---');
    const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    sorted.slice(0, 20).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
    console.log('\n--- Ana kategori bazında ürün sayısı ---');
    Object.entries(byAna).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    prisma.$disconnect();
});
