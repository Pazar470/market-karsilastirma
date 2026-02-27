
import { PrismaClient } from '@prisma/client';
import { getMappedCategory } from './category-mapper';

const prisma = new PrismaClient();

export interface ScrapedProduct {
    name: string;
    price: number;
    imageUrl: string;
    link: string;
    store: string;
    categoryCode: string;
    categoryName: string;
    quantityAmount?: number;
    quantityUnit?: string;
}

export async function upsertProduct(product: ScrapedProduct, marketId: string, categoryId?: string) {
    const validName = product.name.trim();

    // 1. Map Category and Get Tags
    const mapped = getMappedCategory(product.store, product.categoryCode, product.categoryName, product.name);
    const tagsJson = JSON.stringify(mapped.tags);

    // 2. Find or Create Product by marketKey (Source URL)
    let dbProduct = await prisma.product.findUnique({
        where: { marketKey: product.link }
    });

    if (!dbProduct) {
        // Fallback to name-based lookup for legacy or non-keyed products
        // But since we just added the field, we mostly use link.
        dbProduct = await prisma.product.findFirst({
            where: { name: validName }
        });
    }

    if (!dbProduct) {
        dbProduct = await prisma.product.create({
            data: {
                marketKey: product.link,
                name: validName,
                imageUrl: product.imageUrl,
                category: mapped.master,
                categoryId: categoryId,
                quantityAmount: product.quantityAmount,
                quantityUnit: product.quantityUnit,
                isSuspicious: false,
                tags: tagsJson
            }
        });
    } else {
        dbProduct = await prisma.product.update({
            where: { id: dbProduct.id },
            data: {
                marketKey: dbProduct.marketKey || product.link, // Backfill if legacy
                name: validName, // Update name if it changed slightly
                category: mapped.master,
                categoryId: categoryId || dbProduct.categoryId,
                quantityAmount: product.quantityAmount,
                quantityUnit: product.quantityUnit,
                tags: tagsJson,
                updatedAt: new Date()
            }
        });
    }

    // 3. Add Price
    await prisma.price.create({
        data: {
            amount: product.price,
            currency: 'TRY',
            marketId: marketId,
            productId: dbProduct.id,
            productUrl: product.link
        }
    });

    return dbProduct;
}
