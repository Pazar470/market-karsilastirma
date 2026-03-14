
import { PrismaClient } from '@prisma/client';
import { parseQuantityForEggCategory } from './utils';

const prisma = new PrismaClient();

/** categoryId'nin slug'ını döndürür (yumurta kategorisi kontrolü için). */
async function getCategorySlug(categoryId: string | null | undefined): Promise<string | null> {
    if (!categoryId) return null;
    const c = await prisma.category.findUnique({ where: { id: categoryId }, select: { slug: true } });
    return c?.slug ?? null;
}

/** categoryId'nin ağaçta kök (ana) kategori adını döndürür. Kategori yolu sadece ODS/Category kaynaklı. */
async function getRootCategoryName(categoryId: string): Promise<string | null> {
    const all = await prisma.category.findMany({ select: { id: true, name: true, parentId: true } });
    const byId = new Map(all.map((c) => [c.id, c]));
    let cur = byId.get(categoryId);
    while (cur?.parentId) cur = byId.get(cur.parentId);
    return cur?.name ?? null;
}

export interface ScrapedProduct {
    name: string;
    price: number;
    imageUrl: string;
    link: string;
    store: string;
    categoryCode: string;
    categoryName: string;
    categoryPath?: string; // Marketten gelen tam yol (örn. "Süt & Kahvaltılık > Kaşar Peyniri")
    quantityAmount?: number;
    quantityUnit?: string;
    /** Kampanya fiyatı (örn. 10 TL üzeri 389 ₺) */
    campaignAmount?: number;
    /** Kampanya koşulu (örn. "10 TL ve üzeri alışverişlerinizde") */
    campaignCondition?: string;
}

export async function upsertProduct(product: ScrapedProduct, marketId: string, _dbCategoryId?: string) {
    const validName = product.name.trim();

    // 3. Ürünü marketKey (kaynak URL) ile bul ya da oluştur
    let dbProduct = await prisma.product.findUnique({
        where: { marketKey: product.link }
    });

    if (!dbProduct) {
        dbProduct = await prisma.product.findFirst({
            where: { name: validName }
        });
    }

    let didCreate = false;
    if (!dbProduct) {
        // Yeni ürün: categoryId ODS/Admin eşlemesinden; ODS'te "Manuel" işaretli (market+kod) ise atama yapma, admin onayına düşsün.
        let categoryId: string | undefined;
        if (product.categoryCode) {
            const market = await prisma.market.findUnique({ where: { id: marketId }, select: { name: true } });
            if (market?.name) {
                const isManuel = await prisma.marketCategoryManuel.findUnique({
                    where: {
                        marketName_marketCategoryCode: {
                            marketName: market.name,
                            marketCategoryCode: product.categoryCode,
                        },
                    },
                });
                if (!isManuel) {
                    const mapping = await prisma.marketCategoryMapping.findUnique({
                        where: {
                            marketName_marketCategoryCode: {
                                marketName: market.name,
                                marketCategoryCode: product.categoryCode,
                            },
                        },
                        select: { categoryId: true },
                    });
                    if (mapping) categoryId = mapping.categoryId;
                }
            }
        }
        // Bizim kategori ağacında yumurta (slug=yumurta) ise, isimden X'lu/X adet çıkarıp birim adet yazıyoruz.
        let quantityAmount = product.quantityAmount;
        let quantityUnit = product.quantityUnit;
        if (categoryId && (await getCategorySlug(categoryId)) === 'yumurta') {
            const egg = parseQuantityForEggCategory(validName);
            if (egg) {
                quantityAmount = egg.amount;
                quantityUnit = egg.unit;
            }
        }
        // Ana kategori sadece ODS/Category ağacından: categoryId varsa kök adı, yoksa null (senaryo: kullanıcıya göstermeden önce).
        const category = categoryId ? await getRootCategoryName(categoryId) : null;
        try {
            dbProduct = await prisma.product.create({
                data: {
                    marketKey: product.link,
                    name: validName,
                    imageUrl: product.imageUrl,
                    category,
                    categoryId: categoryId ?? null,
                    quantityAmount,
                    quantityUnit,
                    isSuspicious: false,
                    tags: '[]'
                }
            });
            didCreate = true;
        } catch (err: any) {
            // P2002: aynı marketKey ile eşzamanlı create (race); kaydı bulup update yoluna geç
            if (err?.code === 'P2002' && err?.meta?.target?.includes('marketKey')) {
                const existing = await prisma.product.findUnique({ where: { marketKey: product.link } });
                if (existing) dbProduct = existing;
                else throw err;
            } else throw err;
        }
    }
    if (dbProduct && !didCreate) {
        // Mevcut ürün: category ve categoryId ODS/import'tan gelir; taramada güncellenmez. Tags mapper'dan güncellenmez.
        // Bizim kategori ağacında yumurta ise quantity'yi isimden (X'lu / X adet) alıyoruz.
        let updateQuantityAmount = product.quantityAmount;
        let updateQuantityUnit = product.quantityUnit;
        if (dbProduct.categoryId && (await getCategorySlug(dbProduct.categoryId)) === 'yumurta') {
            const egg = parseQuantityForEggCategory(validName);
            if (egg) {
                updateQuantityAmount = egg.amount;
                updateQuantityUnit = egg.unit;
            }
        }
        dbProduct = await prisma.product.update({
            where: { id: dbProduct.id },
            data: {
                marketKey: dbProduct.marketKey || product.link,
                name: validName,
                category: dbProduct.category,
                categoryId: dbProduct.categoryId,
                quantityAmount: updateQuantityAmount,
                quantityUnit: updateQuantityUnit,
                updatedAt: new Date()
            }
        });
    }

    // 4. Fiyat kaydı ekle (kampanya varsa amount = liste fiyatı, campaignAmount = kampanya fiyatı)
    await prisma.price.create({
        data: {
            amount: product.price,
            currency: 'TRY',
            marketId: marketId,
            productId: dbProduct.id,
            productUrl: product.link,
            ...(product.campaignAmount != null && { campaignAmount: product.campaignAmount }),
            ...(product.campaignCondition != null && product.campaignCondition !== '' && { campaignCondition: product.campaignCondition }),
            marketCategoryCode: product.categoryCode || undefined,
            marketCategoryPath: (product.categoryPath ?? product.categoryName) || undefined,
        }
    });

    return dbProduct;
}

const BATCH_SIZE = 200;

/** Toplu yazma: önce mevcut ürünleri bul, yenileri createManyAndReturn ile ekle, fiyatları createMany ile. Döner: bu turda kaç yeni ürün eklendi. */
export async function upsertProductBatch(products: ScrapedProduct[], marketId: string, marketName: string): Promise<{ created: number }> {
    if (products.length === 0) return { created: 0 };
    const links = [...new Set(products.map((p) => p.link))];
    const existing = await prisma.product.findMany({ where: { marketKey: { in: links } }, select: { id: true, marketKey: true } });
    const keyToProduct = new Map<string, { id: string }>(existing.map((p) => [p.marketKey!, p]));

    const toCreate = products.filter((p) => !keyToProduct.has(p.link));
    const byLink = new Map<string, ScrapedProduct>();
    for (const p of toCreate) if (!byLink.has(p.link)) byLink.set(p.link, p);
    const uniqueNew = Array.from(byLink.values());

    if (uniqueNew.length > 0) {
        const codes = [...new Set(uniqueNew.map((p) => p.categoryCode).filter(Boolean))];
        const [mappings, manuelRows] = await Promise.all([
            codes.length > 0
                ? prisma.marketCategoryMapping.findMany({
                      where: { marketName, marketCategoryCode: { in: codes } },
                      select: { marketCategoryCode: true, categoryId: true },
                  })
                : [],
            codes.length > 0
                ? prisma.marketCategoryManuel.findMany({
                      where: { marketName, marketCategoryCode: { in: codes } },
                      select: { marketCategoryCode: true },
                  })
                : [],
        ]);
        const manuelCodes = new Set(manuelRows.map((r) => r.marketCategoryCode));
        const categoryIdByCode = new Map(mappings.map((m) => [m.marketCategoryCode, m.categoryId]));
        const categoryIds = [...new Set(categoryIdByCode.values())];
        const categories = categoryIds.length > 0
            ? await prisma.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true, parentId: true } })
            : [];
        const rootNameByCategoryId = new Map<string, string>();
        for (const c of categories) {
            const root = await getRootCategoryName(c.id);
            if (root) rootNameByCategoryId.set(c.id, root);
        }

        const createData = uniqueNew.map((p) => {
            // ODS'te "Manuel" işaretli kodlarda otomatik atama yok, admin onayına düşer
            const categoryId =
                p.categoryCode && !manuelCodes.has(p.categoryCode)
                    ? (categoryIdByCode.get(p.categoryCode) ?? null)
                    : null;
            const category = categoryId ? (rootNameByCategoryId.get(categoryId) ?? null) : null;
            return {
                marketKey: p.link,
                name: p.name.trim(),
                imageUrl: p.imageUrl,
                category,
                categoryId,
                quantityAmount: p.quantityAmount,
                quantityUnit: p.quantityUnit,
                isSuspicious: false,
                tags: '[]',
            };
        });
        try {
            const created = await prisma.product.createManyAndReturn({ data: createData });
            for (const p of created) if (p.marketKey) keyToProduct.set(p.marketKey, { id: p.id });
        } catch (err: any) {
            if (err?.code === 'P2002') {
                const retryLinks = uniqueNew.map((p) => p.link);
                const refetched = await prisma.product.findMany({ where: { marketKey: { in: retryLinks } }, select: { id: true, marketKey: true } });
                for (const p of refetched) if (p.marketKey) keyToProduct.set(p.marketKey, { id: p.id });
            } else throw err;
        }
    }

    const priceRows = products
        .map((p) => {
            const product = keyToProduct.get(p.link);
            if (!product) return null;
            return {
                productId: product.id,
                marketId,
                amount: p.price,
                currency: 'TRY',
                productUrl: p.link,
                ...(p.campaignAmount != null && { campaignAmount: p.campaignAmount }),
                ...(p.campaignCondition != null && p.campaignCondition !== '' && { campaignCondition: p.campaignCondition }),
                marketCategoryCode: p.categoryCode || null,
                marketCategoryPath: (p.categoryPath ?? p.categoryName) || null,
            };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

    for (let i = 0; i < priceRows.length; i += BATCH_SIZE) {
        const chunk = priceRows.slice(i, i + BATCH_SIZE);
        await prisma.price.createMany({ data: chunk });
    }
    return { created: uniqueNew.length };
}
