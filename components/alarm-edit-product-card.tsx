'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductImage } from '@/components/product-image';
import { MarketLogo } from '@/components/market-logo';
import { getUnitPrice, formatUnitPrice } from '@/lib/unit-price';

export interface AlarmEditProduct {
    id: string;
    name: string;
    imageUrl: string | null;
    quantityAmount: number | null;
    quantityUnit: string | null;
    prices: {
        amount: string;
        campaignAmount?: string | null;
        market: { name: string };
    }[];
}

interface AlarmEditProductCardProps {
    product: AlarmEditProduct;
    /** Sağ alt köşede gösterilecek butonlar (örn. Gizle, Takibe Al) */
    actions?: React.ReactNode;
}

export function AlarmEditProductCard({ product, actions }: AlarmEditProductCardProps) {
    const priceInfo = product.prices?.[0];
    const price = priceInfo
        ? (priceInfo.campaignAmount != null ? parseFloat(priceInfo.campaignAmount) : parseFloat(priceInfo.amount))
        : null;
    const unitPriceInfo =
        price != null && product.quantityAmount
            ? getUnitPrice(price, product.quantityAmount, product.quantityUnit)
            : null;

    return (
        <Card className="overflow-hidden h-full border border-gray-200 bg-white hover:shadow-md transition-shadow">
            <Link href={`/product/${product.id}`} className="block">
                <div className="aspect-square relative flex items-center justify-center p-2 bg-white">
                    <ProductImage
                        src={product.imageUrl}
                        alt={product.name}
                        className="max-h-full max-w-full object-contain"
                    />
                    {unitPriceInfo && (
                        <div className="absolute top-1 right-1">
                            <span className="bg-green-100 text-green-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                {formatUnitPrice(unitPriceInfo.value, unitPriceInfo.displayUnit)}
                            </span>
                        </div>
                    )}
                    {actions && (
                        <div
                            className="absolute bottom-1 right-1 flex gap-1"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                        >
                            {actions}
                        </div>
                    )}
                </div>
                <CardHeader className="p-2 pb-0">
<div className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-2xl text-xs font-semibold bg-blue-50 text-blue-700 w-fit">
                                                        <MarketLogo marketName={priceInfo?.market?.name} size="lg" />
                                                    </div>
                    <CardTitle className="text-xs font-medium leading-tight line-clamp-2 mt-1" title={product.name}>
                        {product.name}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-2 pt-0">
                    {price != null ? (
                        <span className="text-sm font-bold text-gray-900">
                            {price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                        </span>
                    ) : (
                        <span className="text-sm text-gray-500">—</span>
                    )}
                </CardContent>
            </Link>
        </Card>
    );
}
