'use client';

import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { sortCategoriesByOrder } from '@/lib/category-order';
import { AddToBasketButton } from './add-to-basket-button';
import { FollowButton } from './follow-button';
import { ProductImage } from '@/components/product-image';
import { MarketLogo } from '@/components/market-logo';

interface Facet {
    name: string;
    count: number;
}

interface Product {
    id: string;
    name: string;
    imageUrl: string | null;
    quantityAmount: number | null;
    quantityUnit: string | null;
    category: string | null;
    categoryId?: string | null;
    masterCategory?: { id: string; name: string } | null;
    prices: {
        amount: string;
        campaignAmount?: string | null;
        campaignCondition?: string | null;
        currency: string;
        market: { name: string };
        date: string;
    }[];
}

export function ProductSearch() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // State derived from URL
    const urlQuery = searchParams.get('q') || '';
    const urlSort = searchParams.get('sortBy') || '';
    const urlMarket = searchParams.get('market') || '';
    const urlCategory = searchParams.getAll('category');
    const urlCategoryId = searchParams.get('categoryId');

    // Local state
    // Initial state MUST be empty to match server (hydration fix)
    const [query, setQuery] = useState(urlQuery);
    const [products, setProducts] = useState<Product[]>([]);
    const [facets, setFacets] = useState<Facet[]>([]);
    const [loading, setLoading] = useState(false);

    // Autocomplete state
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLFormElement>(null);

    // Sync local input when URL changes (e.g. back button)
    useEffect(() => {
        setQuery(urlQuery);
    }, [urlQuery]);

    // Varsayılan: parametre yoksa bizim kategori sıramızdaki ilk kategoriyle aç (karışık ürün gelmesin, sabit olsun)
    const hasExplicitFilter = !!urlQuery || !!urlCategoryId || (Array.isArray(urlCategory) && urlCategory.length > 0);
    useEffect(() => {
        if (!hasExplicitFilter) {
            if (products.length === 0) setLoading(true);
            fetch('/api/categories/tree')
                .then((res) => res.json())
                .then((data) => {
                    const roots = Array.isArray(data) ? data : [];
                    const sorted = sortCategoriesByOrder(roots);
                    const first = sorted[0];
                    if (first?.id) {
                        router.replace(`/?categoryId=${encodeURIComponent(first.id)}`);
                    } else {
                        fetchProducts();
                    }
                })
                .catch(() => fetchProducts());
            return;
        }
        fetchProducts();
    }, [searchParams, hasExplicitFilter]);

    // Close suggestions on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    // Scroll restoration: save position when user scrolls (throttled) or before going to product detail
    const scrollKey = `search_scroll_${searchParams.toString()}`;
    useEffect(() => {
        if (products.length === 0) return;
        let ticking = false;
        const saveScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                try {
                    sessionStorage.setItem(scrollKey, String(window.scrollY));
                } finally {
                    ticking = false;
                }
            });
        };
        window.addEventListener('scroll', saveScroll, { passive: true });
        return () => window.removeEventListener('scroll', saveScroll);
    }, [products.length, scrollKey]);

    // Restore scroll when returning from product detail (after list is rendered)
    useEffect(() => {
        if (products.length === 0) return;
        const saved = sessionStorage.getItem(scrollKey);
        if (saved === null) return;
        const y = parseInt(saved, 10);
        if (Number.isNaN(y) || y <= 0) return;
        const id = requestAnimationFrame(() => {
            window.scrollTo({ top: y, behavior: 'instant' });
            try {
                sessionStorage.removeItem(scrollKey);
            } catch (_) {}
        });
        return () => cancelAnimationFrame(id);
    }, [products.length, scrollKey]);

    const fetchProducts = async () => {
        // If we have products (from cache), don't show full loading spinner, maybe just validatin
        if (products.length === 0) setLoading(true);

        try {
            const cacheKey = `search_cache_${searchParams.toString()}`;
            const url = `/api/products?${searchParams.toString()}`;
            const res = await fetch(url);
            const data = await res.json();

            if (Array.isArray(data)) {
                setProducts(data);
                setFacets([]);
            } else {
                setProducts(data.products || []);
                setFacets(data.facets || []);
            }

            // Update cache
            sessionStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to fetch products', error);
        } finally {
            setLoading(false);
        }
    };

    const updateUrl = (newParams: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(newParams).forEach(([key, value]) => {
            if (value === null || value === '') {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        });
        router.push(`/?${params.toString()}`);
    };

    const fetchSuggestions = async (input: string) => {
        if (input.length < 2) {
            setSuggestions([]);
            return;
        }
        try {
            const res = await fetch(`/api/products/suggest?q=${encodeURIComponent(input)}`);
            if (res.ok) {
                const data = await res.json();
                setSuggestions(data);
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error);
        }
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        fetchSuggestions(val);
        setShowSuggestions(true);
    };

    const handleSuggestionClick = (suggestion: string) => {
        setQuery(suggestion);
        setShowSuggestions(false);
        updateUrl({ q: suggestion });
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setShowSuggestions(false);
        updateUrl({ q: query });
    };

    const toggleCategory = (category: string) => {
        const params = new URLSearchParams(searchParams.toString());
        const current = params.getAll('category');

        if (current.includes(category)) {
            params.delete('category');
            current.filter(c => c !== category).forEach(c => params.append('category', c));
        } else {
            params.append('category', category);
        }
        router.push(`/?${params.toString()}`);
    };

    const selectClass = 'flex h-11 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

    return (
        <div className="w-full max-w-6xl mx-auto space-y-3 sm:space-y-4">
            {/* Masaüstü: arama + market/sıra aynı satırda. Mobilde arama header'da. */}
            <div className="hidden md:flex flex-row gap-2 sm:gap-3">
                <form onSubmit={handleSubmit} className="flex gap-1.5 sm:gap-2 flex-1 relative min-w-0" ref={wrapperRef}>
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            type="search"
                            placeholder="Ürün ara..."
                            className="pl-8 h-10 md:h-10 text-sm"
                            value={query}
                            onChange={handleInputChange}
                            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                        />
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-56 overflow-y-auto">
                                {suggestions.map((suggestion, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        className="w-full px-4 py-3 text-left text-sm hover:bg-gray-100 active:bg-gray-100"
                                        onClick={() => handleSuggestionClick(suggestion)}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <Button type="submit" disabled={loading} className="h-10 shrink-0 text-sm px-4 min-w-[44px]">
                        {loading ? '...' : 'Ara'}
                    </Button>
                </form>

                {/* Masaüstü: market + sıralama inline */}
                <div className="hidden md:flex gap-2 w-auto">
                    <select
                        className={cn(selectClass, 'w-36')}
                        value={urlMarket}
                        onChange={(e) => updateUrl({ market: e.target.value })}
                    >
                        <option value="">Tüm Marketler</option>
                        <option value="A101">A101</option>
                        <option value="Şok">Şok</option>
                        <option value="Migros">Migros</option>
                        <option value="Carrefour">Carrefour (Yakında)</option>
                    </select>
                    <select
                        className={cn(selectClass, 'w-44')}
                        value={urlSort}
                        onChange={(e) => updateUrl({ sortBy: e.target.value })}
                    >
                        <option value="">Varsayılan Sıralama</option>
                        <option value="unitPriceAsc">Birim Fiyat (En Ucuz)</option>
                        <option value="priceAsc">Fiyat (Artan)</option>
                        <option value="priceDesc">Fiyat (Azalan)</option>
                    </select>
                </div>

            </div>

            {/* Kategori ile filtrelenmişse: Alarm sayfasına taşı */}
            {urlCategoryId && (
                <div className="flex flex-wrap items-center gap-1.5 py-1">
                    <Link href={`/alarms/new?categoryId=${encodeURIComponent(urlCategoryId)}`}>
                        <Button variant="outline" size="sm" className="bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 text-xs h-8">
                            Alarm sayfasına taşı
                        </Button>
                    </Link>
                    <span className="text-xs text-gray-500">Bu kategori için fiyat alarmı kurabilirsiniz.</span>
                </div>
            )}

            {/* Facets / Filters: mobilde karmaşıklık yaratıyor, şimdilik gizli */}

            {loading ? (
                <div className="text-center py-6 text-sm">Yükleniyor...</div>
            ) : products.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">Ürün bulunamadı.</div>
            ) : (
                <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-3 md:gap-4">
                    {products.map((product) => {
                        const priceInfo = product.prices[0];
                        return (
                            <Link
                                href={`/product/${product.id}`}
                                key={product.id}
                                onClick={() => {
                                    try {
                                        sessionStorage.setItem(scrollKey, String(window.scrollY));
                                    } catch (_) {}
                                }}
                                className="flex flex-col"
                            >
                                <Card className="overflow-hidden hover:shadow-md active:scale-[0.98] transition-all cursor-pointer h-full border border-gray-200/80 sm:border-blue-100/50" title={product.name}>
                                    <div className="aspect-[4/5] sm:aspect-square relative flex items-center justify-center p-1.5 sm:p-3 bg-white">
                                        <ProductImage
                                            src={product.imageUrl}
                                            alt={product.name}
                                            className="max-h-full max-w-full object-contain"
                                        />
                                        {priceInfo && (
                                            <div className="absolute top-0.5 right-0.5 sm:top-1.5 sm:right-1.5 flex flex-col items-end gap-0.5">
                                                <div className="bg-green-600 text-white text-[9px] sm:text-xs font-bold px-1 sm:px-1.5 py-0.5 rounded-full shadow-sm">
                                                    {(() => {
                                                        const price = priceInfo.campaignAmount != null ? parseFloat(priceInfo.campaignAmount) : parseFloat(priceInfo.amount);
                                                        const amount = product.quantityAmount;
                                                        const unit = (product.quantityUnit || '').toLowerCase();
                                                        if (!amount || !product.quantityUnit || unit === 'adet' || unit === 'ad') {
                                                            return `${price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺/adet`;
                                                        }
                                                        let unitPrice = price / amount;
                                                        let displayUnit = unit === 'l' || unit === 'lt' ? 'L' : 'kg';
                                                        if (unit === 'g' || unit === 'gr' || unit === 'ml') {
                                                            unitPrice = unitPrice * 1000;
                                                            displayUnit = unit === 'ml' ? 'L' : 'kg';
                                                        }
                                                        return `${unitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺/${displayUnit}`;
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                        <div
                                            className="absolute bottom-0.5 right-0.5 sm:bottom-1.5 sm:right-1.5 flex gap-0.5 sm:gap-1 items-center"
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                        >
                                            <FollowButton productId={product.id} categoryId={product.categoryId ?? product.masterCategory?.id ?? undefined} className="h-11 w-11 sm:h-8 sm:w-8 shrink-0 rounded-full bg-white/95 shadow sm:bg-transparent sm:shadow-none flex items-center justify-center touch-manipulation" />
                                            {priceInfo && (
                                                <>
                                                    <AddToBasketButton
                                                        product={{
                                                            id: product.id,
                                                            name: product.name,
                                                            imageUrl: product.imageUrl || '',
                                                            price: priceInfo.campaignAmount != null ? parseFloat(priceInfo.campaignAmount) : parseFloat(priceInfo.amount),
                                                            marketName: priceInfo.market.name
                                                        }}
                                                        variant="icon"
                                                        className="h-11 w-11 sm:h-8 sm:w-8 touch-manipulation"
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <CardHeader className="p-1.5 sm:p-3 pb-0">
                                        <div className="flex justify-between items-start mb-0">
                                            <div className="inline-flex items-center gap-1 px-1 sm:px-2 py-0.5 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-semibold bg-blue-50 text-blue-700 min-w-0 overflow-hidden shrink-0 max-w-[80%]">
                                                <MarketLogo marketName={priceInfo?.market.name} size="lg" />
                                            </div>
                                        </div>
                                        <CardTitle
                                            className="text-[11px] sm:text-sm font-medium leading-tight line-clamp-2 mt-0.5"
                                            title={product.name}
                                        >
                                            {product.name}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-1.5 sm:p-3 pt-0">
                                        <div className="text-sm sm:text-lg font-bold text-gray-900 mt-0.5 sm:mt-1">
                                            {priceInfo ? (() => {
                                                const campaign = priceInfo.campaignAmount != null ? parseFloat(priceInfo.campaignAmount) : null;
                                                const list = parseFloat(priceInfo.amount);
                                                const display = campaign ?? list;
                                                return (
                                                    <>
                                                        {display.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                                                        {campaign != null && list !== campaign && (
                                                            <span className="ml-1 text-sm font-normal text-gray-500 line-through">{list.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        )}
                                                    </>
                                                );
                                            })() : '-'}
                                        </div>
                                        {priceInfo?.campaignCondition && (
                                            <div className="text-[9px] sm:text-xs text-amber-700 font-medium mt-0.5 line-clamp-1">{priceInfo.campaignCondition}</div>
                                        )}
                                        {priceInfo && (
                                            <div className="text-[9px] sm:text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">
                                                {(() => {
                                                    const price = priceInfo.campaignAmount != null ? parseFloat(priceInfo.campaignAmount) : parseFloat(priceInfo.amount);
                                                    const amount = product.quantityAmount;
                                                    const unit = (product.quantityUnit || '').toLowerCase();
                                                    const lengthUnits = ['cm', 'mm', 'm', 'metre', 'inch', 'inç', '"'];
                                                    if (!amount || !product.quantityUnit || unit === 'adet' || unit === 'ad' || lengthUnits.includes(unit)) {
                                                        return `${price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺ / adet`;
                                                    }
                                                    let unitPrice = price / amount;
                                                    let displayUnit = unit === 'l' || unit === 'lt' ? 'L' : 'kg';
                                                    if (unit === 'g' || unit === 'gr' || unit === 'ml') {
                                                        unitPrice = unitPrice * 1000;
                                                        displayUnit = unit === 'ml' ? 'L' : 'kg';
                                                    }
                                                    return `${unitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺ / ${displayUnit}`;
                                                })()}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
