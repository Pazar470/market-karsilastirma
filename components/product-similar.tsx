'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface SimilarProduct {
    id: string;
    name: string;
    price: number;
    marketName: string;
    imageUrl: string;
    matchScore: number;
}

interface ProductSimilarProps {
    currentProductId: string;
    products: SimilarProduct[];
}

export function ProductSimilar({ currentProductId, products }: ProductSimilarProps) {
    if (products.length === 0) return null;

    return (
        <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">Diğer Marketlerdeki Benzer Ürünler</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                    <Link href={`/product/${product.id}`} key={product.id}>
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-blue-100">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex justify-between items-start">
                                    <Badge variant={product.marketName === 'Şok' ? 'default' : 'secondary'} className="mb-2">
                                        {product.marketName}
                                    </Badge>
                                    <span className="text-xs text-green-600 font-bold">
                                        %{Math.round(product.matchScore * 100)} Eşleşme
                                    </span>
                                </div>
                                <CardTitle className="text-sm font-medium line-clamp-2 h-10">
                                    {product.name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="flex items-center gap-4 mt-2">
                                    <div className="relative w-16 h-16">
                                        <img
                                            src={product.imageUrl}
                                            alt={product.name}
                                            className="object-contain w-full h-full"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-lg font-bold text-blue-600">
                                            {product.price.toFixed(2)} ₺
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
