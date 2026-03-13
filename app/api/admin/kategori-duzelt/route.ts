import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const MAX_CATEGORY_CODES = 500;
const MAX_PRODUCTS_PER_PAGE = 50;

/** Piyasa listesi, market kategori kodları (filtre için) veya ürün listesi (sayfalı). */
export async function GET(request: Request) {
    const unauth = await requireAdmin();
    if (unauth) return unauth;
    const { searchParams } = new URL(request.url);
    const what = searchParams.get('what');

    try {
        if (what === 'markets') {
            const markets = await prisma.market.findMany({
                orderBy: { name: 'asc' },
                select: { id: true, name: true },
            });
            return NextResponse.json({ markets });
        }

        if (what === 'categoryCodes') {
            const marketName = searchParams.get('marketName');
            if (!marketName?.trim()) {
                return NextResponse.json({ error: 'marketName gerekli' }, { status: 400 });
            }
            const market = await prisma.market.findFirst({ where: { name: marketName.trim() }, select: { id: true } });
            if (!market) {
                return NextResponse.json({ categoryCodes: [] });
            }
            const since = new Date();
            since.setDate(since.getDate() - 90);
            const rows = await prisma.price.findMany({
                where: { marketId: market.id, date: { gte: since }, marketCategoryCode: { not: null } },
                select: { marketCategoryCode: true, marketCategoryPath: true },
                distinct: ['marketCategoryCode'],
                orderBy: { marketCategoryCode: 'asc' },
                take: MAX_CATEGORY_CODES,
            });
            const categoryCodes = rows
                .filter((r) => r.marketCategoryCode)
                .map((r) => ({
                    marketCategoryCode: r.marketCategoryCode!,
                    marketCategoryPath: r.marketCategoryPath ?? undefined,
                }));
            return NextResponse.json({ categoryCodes });
        }

        if (what === 'products') {
            const marketName = searchParams.get('marketName')?.trim() || undefined;
            const marketCategoryCode = searchParams.get('marketCategoryCode') || undefined;
            const masterCategoryId = searchParams.get('masterCategoryId')?.trim() || undefined;
            const search = searchParams.get('search')?.trim() || undefined;
            const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
            const limit = Math.min(MAX_PRODUCTS_PER_PAGE, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)));

            const hasMarket = !!marketName;
            if (!hasMarket && !masterCategoryId && !search) {
                return NextResponse.json(
                    { error: 'En az biri gerekli: Market, Master kategori (bizim yol) veya Ürün ara' },
                    { status: 400 }
                );
            }

            /** Bizim kategori ağacında bir id ile onun tüm alt kategorilerinin id'leri. */
            let masterCategoryIds: string[] | undefined;
            if (masterCategoryId) {
                const allCats = await prisma.category.findMany({ select: { id: true, parentId: true } });
                const byParent = new Map<string, { id: string }[]>();
                for (const c of allCats) {
                    const key = c.parentId ?? '';
                    if (!byParent.has(key)) byParent.set(key, []);
                    byParent.get(key)!.push({ id: c.id });
                }
                const ids: string[] = [];
                const queue = [masterCategoryId];
                while (queue.length > 0) {
                    const id = queue.shift()!;
                    ids.push(id);
                    for (const ch of byParent.get(id) ?? []) {
                        queue.push(ch.id);
                    }
                }
                masterCategoryIds = ids.length > 0 ? ids : undefined;
            }

            type ProductWhere = {
                prices?: { some: Record<string, unknown> };
                name?: { contains: string; mode: 'insensitive' };
                categoryId?: { in: string[] };
            };

            let productWhere: ProductWhere = {
                ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
                ...(masterCategoryIds?.length ? { categoryId: { in: masterCategoryIds } } : {}),
            };

            let marketId: string | null = null;
            if (hasMarket) {
                const market = await prisma.market.findFirst({ where: { name: marketName! }, select: { id: true } });
                if (!market) {
                    return NextResponse.json({ products: [], total: 0 });
                }
                marketId = market.id;
                const priceWhere: { marketId: string; marketCategoryCode?: string } = { marketId: market.id };
                if (marketCategoryCode) priceWhere.marketCategoryCode = marketCategoryCode;
                productWhere = { ...productWhere, prices: { some: priceWhere } };
            } else {
                productWhere = { ...productWhere, prices: { some: {} } };
            }

            const [products, total] = await Promise.all([
                prisma.product.findMany({
                    where: productWhere,
                    include:
                        marketId !== null
                            ? {
                                  prices: {
                                      where: { marketId },
                                      orderBy: { date: 'desc' },
                                      take: 1,
                                      select: { marketCategoryCode: true, marketCategoryPath: true },
                                  },
                                  masterCategory: { select: { id: true, name: true, parentId: true } },
                              }
                            : {
                                  prices: {
                                      orderBy: { date: 'desc' },
                                      take: 1,
                                      select: { marketCategoryCode: true, marketCategoryPath: true },
                                      include: { market: { select: { name: true } } },
                                  },
                                  masterCategory: { select: { id: true, name: true, parentId: true } },
                              },
                    orderBy: { name: 'asc' },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                prisma.product.count({ where: productWhere }),
            ]);

            const allCategories = await prisma.category.findMany({ select: { id: true, name: true, parentId: true } });
            const catById = new Map(allCategories.map((c) => [c.id, c]));
            function pathFor(categoryId: string | null): string {
                if (!categoryId) return '—';
                const parts: string[] = [];
                let id: string | null = categoryId;
                const seen = new Set<string>();
                while (id && !seen.has(id)) {
                    seen.add(id);
                    const c = catById.get(id);
                    if (!c) break;
                    parts.unshift(c.name || 'Diğer');
                    id = c.parentId;
                }
                return parts.join(' > ') || '—';
            }

            const list = products.map((p) => {
                const price = p.prices[0] as { marketCategoryCode?: string | null; marketCategoryPath?: string | null; market?: { name: string } } | undefined;
                return {
                    id: p.id,
                    name: p.name,
                    categoryId: p.categoryId,
                    category: p.category,
                    masterCategoryPath: pathFor(p.categoryId),
                    marketCategoryCode: price?.marketCategoryCode ?? null,
                    marketCategoryPath: price?.marketCategoryPath ?? null,
                    marketName: price?.market?.name ?? null,
                };
            });

            return NextResponse.json({ products: list, total });
        }

        return NextResponse.json({ error: 'Geçersiz what parametresi' }, { status: 400 });
    } catch (e) {
        console.error('GET /api/admin/kategori-duzelt', e);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}
