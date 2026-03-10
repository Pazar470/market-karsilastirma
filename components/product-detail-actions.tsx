'use client';

import { FollowButton } from '@/components/follow-button';
import { AddToAlarmButton } from '@/components/add-to-alarm-button';
import { AddToBasketButton } from '@/components/add-to-basket-button';

interface ProductDetailActionsProps {
    productId: string;
    categoryId: string | null | undefined;
    product: {
        id: string;
        name: string;
        imageUrl: string | null;
        price: number;
        marketName: string;
    };
}

export function ProductDetailActions({ productId, categoryId, product }: ProductDetailActionsProps) {
    return (
        <div className="flex flex-wrap items-center gap-2 mt-4">
            <FollowButton productId={productId} categoryId={categoryId ?? undefined} variant="text" />
            <AddToAlarmButton productId={productId} categoryId={categoryId ?? undefined} />
            <AddToBasketButton
                product={{
                    id: product.id,
                    name: product.name,
                    imageUrl: product.imageUrl || '',
                    price: product.price,
                    marketName: product.marketName,
                }}
                variant="default"
            />
        </div>
    );
}
