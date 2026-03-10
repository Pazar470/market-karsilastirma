'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductImage } from '@/components/product-image';
import { MarketLogo } from '@/components/market-logo';
import { AddToBasketButton } from '@/components/add-to-basket-button';
import { StarOff } from 'lucide-react';

interface FollowedProduct {
    id: string;
    name: string;
    imageUrl: string | null;
    quantityAmount: number | null;
    quantityUnit: string | null;
    categoryId: string | null;
    prices: { amount: string | number; campaignAmount?: string | number | null; market: { name: string } }[];
    masterCategory?: { id: string; name: string } | null;
}

interface CategoryGroup {
    categoryId: string;
    categoryPath: string;
    products: FollowedProduct[];
}

export default function TakipEdilenPage() {
    const [groups, setGroups] = useState<CategoryGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchList = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/follow');
            if (res.status === 401) {
                setError('Giriş yapmanız gerekiyor.');
                setGroups([]);
                return;
            }
            if (!res.ok) {
                setError('Liste yüklenemedi.');
                setGroups([]);
                return;
            }
            const data = await res.json();
            setGroups(Array.isArray(data) ? data : []);
        } catch {
            setError('Liste yüklenemedi.');
            setGroups([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchList();
    }, []);

    const handleUnfollow = async (productId: string) => {
        try {
            await fetch(`/api/follow?productId=${encodeURIComponent(productId)}`, { method: 'DELETE' });
            setGroups((prev) =>
                prev
                    .map((cat) => ({
                        ...cat,
                        products: cat.products.filter((p) => p.id !== productId),
                    }))
                    .filter((cat) => cat.products.length > 0)
            );
        } catch (_) {}
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-xl font-bold text-gray-900 mb-4">Takip Edilen Ürünler</h1>
                <p className="text-sm text-gray-500">Yükleniyor...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-xl font-bold text-gray-900 mb-4">Takip Edilen Ürünler</h1>
                <p className="text-sm text-red-600">{error}</p>
                <Link href="/login" className="text-blue-600 text-sm mt-2 inline-block hover:underline">
                    Giriş yap
                </Link>
            </div>
        );
    }

    if (groups.length === 0) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-xl font-bold text-gray-900 mb-4">Takip Edilen Ürünler</h1>
                <p className="text-sm text-gray-500">Henüz takip ettiğiniz ürün yok. Anasayfadan veya alarm sayfalarından ürünlere yıldız ile takibe alabilirsiniz.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-6 sm:py-8">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Takip Edilen Ürünler</h1>
            <div className="space-y-8">
                {groups.map((group) => (
                    <section key={group.categoryId || 'uncat'}>
                        <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide border-b border-gray-200 pb-2">
                            {group.categoryPath}
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {group.products.map((product) => {
                                const priceInfo = product.prices?.[0];
                                const price = priceInfo
                                    ? (priceInfo.campaignAmount != null ? Number(priceInfo.campaignAmount) : Number(priceInfo.amount))
                                    : 0;
                                return (
                                    <Card key={product.id} className="overflow-hidden h-full border border-gray-200 bg-white hover:shadow-md transition-shadow">
                                        <Link href={`/product/${product.id}`} className="block">
                                            <div className="aspect-square relative flex items-center justify-center p-2 bg-white">
                                                <ProductImage
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    className="max-h-full max-w-full object-contain"
                                                />
                                                <div
                                                    className="absolute bottom-1 right-1 flex gap-1 flex-wrap justify-end"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                    }}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUnfollow(product.id)}
                                                        className="h-7 px-2 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold hover:bg-amber-200 flex items-center gap-1"
                                                    >
                                                        <StarOff className="w-3.5 h-3.5" />
                                                        Takibi bırak
                                                    </button>
                                                    {priceInfo && (
                                                        <AddToBasketButton
                                                            product={{
                                                                id: product.id,
                                                                name: product.name,
                                                                imageUrl: product.imageUrl || '',
                                                                price,
                                                                marketName: priceInfo.market?.name || 'Market',
                                                            }}
                                                            variant="icon"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                            <CardHeader className="p-2 pb-0">
                                                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 w-fit">
                                                    <MarketLogo marketName={priceInfo?.market?.name} size="lg" />
                                                </div>
                                                <CardTitle className="text-xs font-medium leading-tight line-clamp-2 mt-1" title={product.name}>
                                                    {product.name}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-2 pt-0">
                                                {price > 0 ? (
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
                            })}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}
