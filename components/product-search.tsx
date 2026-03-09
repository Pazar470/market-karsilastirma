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
import { AddToBasketButton } from './add-to-basket-button';
import { AddToAlarmButton } from './add-to-alarm-button';
import { ProductImage } from '@/components/product-image';

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

    // Force fresh fetch on mount/param change
    useEffect(() => {
        fetchProducts();
    }, [searchParams]);

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

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row gap-4">
                <form onSubmit={handleSubmit} className="flex gap-2 flex-1 relative" ref={wrapperRef}>
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Ürün ara..."
                            className="pl-8"
                            value={query}
                            onChange={handleInputChange}
                            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                        />
                        {/* Autocomplete Suggestions */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                                {suggestions.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                        onClick={() => handleSuggestionClick(suggestion)}
                                    >
                                        {suggestion}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Aranıyor...' : 'Ara'}
                    </Button>
                </form>

                <div className="w-full md:w-auto flex gap-2">
                    <select
                        className="flex h-10 w-full md:w-40 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                        className="flex h-10 w-full md:w-48 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                <div className="flex items-center gap-2 py-2">
                    <Link href={`/alarms/new?categoryId=${encodeURIComponent(urlCategoryId)}`}>
                        <Button variant="outline" className="bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100">
                            Alarm sayfasına taşı
                        </Button>
                    </Link>
                    <span className="text-sm text-gray-500">Bu kategori için fiyat alarmı kurabilirsiniz.</span>
                </div>
            )}

            {/* Facets / Filters: mobilde karmaşıklık yaratıyor, şimdilik gizli */}

            {loading ? (
                <div className="text-center py-10">Yükleniyor...</div>
            ) : products.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">Ürün bulunamadı.</div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
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
                            >
                                <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full border-blue-100/50" title={product.name}>
                                    <div className="aspect-square relative flex items-center justify-center p-4 bg-white">
                                        <ProductImage
                                            src={product.imageUrl}
                                            alt={product.name}
                                            className="max-h-full max-w-full object-contain"
                                        />
                                        {priceInfo && (
                                            <div className="absolute top-2 right-2 flex flex-col items-end gap-2">
                                                <div className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full shadow-sm">
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
                                        {/* Actions Group */}
                                        <div className="absolute bottom-2 right-2 flex gap-2">
                                            {priceInfo && (
                                                <>
                                                    <AddToAlarmButton productId={product.id} categoryId={product.categoryId ?? product.masterCategory?.id ?? undefined} />
                                                    <AddToBasketButton
                                                        product={{
                                                            id: product.id,
                                                            name: product.name,
                                                            imageUrl: product.imageUrl || '',
                                                            price: priceInfo.campaignAmount != null ? parseFloat(priceInfo.campaignAmount) : parseFloat(priceInfo.amount),
                                                            marketName: priceInfo.market.name
                                                        }}
                                                        variant="icon"
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <CardHeader className="p-4 pb-2">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold
                                                bg-blue-50 text-blue-700">
                                                <span
                                                    className={cn(
                                                        'inline-block h-3 w-3 rounded-sm',
                                                        priceInfo?.market.name === 'A101' && 'bg-cyan-500',
                                                        priceInfo?.market.name === 'Migros' && 'bg-orange-500',
                                                        priceInfo?.market.name === 'Şok' && 'bg-yellow-400',
                                                        priceInfo?.market.name === 'BİM' && 'bg-red-500',
                                                        (!priceInfo?.market.name || !['A101', 'Migros', 'Şok', 'BİM'].includes(priceInfo.market.name)) && 'bg-gray-400'
                                                    )}
                                                />
                                                <span>{priceInfo?.market.name || 'Market'}</span>
                                            </div>
                                        </div>

                                        <CardTitle
                                            className="text-sm font-medium leading-tight overflow-y-auto overscroll-contain max-h-14 min-h-[2.5rem] scroll-smooth touch-manipulation"
                                            style={{ WebkitOverflowScrolling: 'touch' }}
                                            title={product.name}
                                        >
                                            {product.name}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <div className="text-2xl font-bold text-gray-900 mt-2">
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
                                            <div className="text-xs text-amber-700 font-medium mt-0.5">{priceInfo.campaignCondition}</div>
                                        )}
                                        {priceInfo && (
                                            <div className="text-xs text-gray-500 font-medium mt-1">
                                                {(() => {
                                                    const price = priceInfo.campaignAmount != null ? parseFloat(priceInfo.campaignAmount) : parseFloat(priceInfo.amount);
                                                    const amount = product.quantityAmount;
                                                    const unit = (product.quantityUnit || '').toLowerCase();
                                                    if (!amount || !product.quantityUnit || unit === 'adet' || unit === 'ad') {
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
