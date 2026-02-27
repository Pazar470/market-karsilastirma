'use client';

import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AddToBasketButton } from './add-to-basket-button';
import { AddToAlarmButton } from './add-to-alarm-button';

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
    prices: {
        amount: string;
        currency: string;
        market: {
            name: string;
        };
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
                            placeholder="Ürün ara (örn: Kaşar, Süt)..."
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

            {/* Facets / Filters */}
            {facets.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-2">
                    <span className="text-sm font-medium text-gray-500 py-1">Kategoriler:</span>
                    {facets.slice(0, 10).map((facet) => {
                        const isSelected = urlCategory.includes(facet.name);
                        return (
                            <Badge
                                key={facet.name}
                                variant={isSelected ? "default" : "secondary"}
                                className={`cursor-pointer hover:opacity-80 transition-opacity ${isSelected ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                                onClick={() => toggleCategory(facet.name)}
                            >
                                {facet.name.split('>').pop()?.trim()} <span className="ml-1 opacity-60 text-xs">({facet.count})</span>
                            </Badge>
                        );
                    })}
                </div>
            )}

            {loading ? (
                <div className="text-center py-10">Yükleniyor...</div>
            ) : products.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">Ürün bulunamadı.</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.map((product) => {
                        const priceInfo = product.prices[0];
                        return (
                            <Link href={`/product/${product.id}`} key={product.id}>
                                <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full border-blue-100/50" title={product.name}>
                                    <div className="aspect-square relative flex items-center justify-center p-4 bg-white">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={product.imageUrl || '/placeholder.png'}
                                            alt={product.name}
                                            className="max-h-full max-w-full object-contain"
                                        />
                                        {priceInfo && product.quantityAmount && (
                                            <div className="absolute top-2 right-2 flex flex-col items-end gap-2">
                                                <div className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                                                    {(() => {
                                                        const price = parseFloat(priceInfo.amount);
                                                        // Unit normalization for display
                                                        // We want to show price per KG or per L
                                                        let unitPrice = price / product.quantityAmount;
                                                        let displayUnit = product.quantityUnit;

                                                        if (displayUnit === 'g' || displayUnit === 'gr' || displayUnit === 'ml') {
                                                            unitPrice = unitPrice * 1000;
                                                            displayUnit = (displayUnit === 'ml') ? 'L' : 'kg';
                                                        } else if (displayUnit === 'kg' || displayUnit === 'l' || displayUnit === 'lt') {
                                                            // Already correct, normalize label
                                                            displayUnit = (displayUnit === 'l' || displayUnit === 'lt') ? 'L' : 'kg';
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
                                                    <AddToAlarmButton productId={product.id} />
                                                    <AddToBasketButton
                                                        product={{
                                                            id: product.id,
                                                            name: product.name,
                                                            imageUrl: product.imageUrl || '',
                                                            price: parseFloat(priceInfo.amount),
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
                                            <div className="text-xs font-semibold text-blue-600">
                                                {priceInfo?.market.name || 'Bilinmiyor'}
                                            </div>
                                        </div>

                                        <CardTitle className="text-sm font-medium leading-tight line-clamp-2 h-10">
                                            {product.name}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <div className="text-2xl font-bold text-gray-900 mt-2">
                                            {priceInfo ? `${parseFloat(priceInfo.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺` : '-'}
                                        </div>
                                        {priceInfo && product.quantityAmount && (
                                            <div className="text-xs text-gray-500 font-medium mt-1">
                                                {(() => {
                                                    const price = parseFloat(priceInfo.amount);
                                                    // We want to show price per KG or per L
                                                    let displayUnit = product.quantityUnit?.toLowerCase() || 'kg';
                                                    let unitPrice = price / (product.quantityAmount || 1);

                                                    if (displayUnit === 'g' || displayUnit === 'gr' || displayUnit === 'ml') {
                                                        unitPrice = unitPrice * 1000;
                                                        displayUnit = (displayUnit === 'ml') ? 'L' : 'kg';
                                                    } else if (displayUnit === 'kg' || displayUnit === 'l' || displayUnit === 'lt') {
                                                        // Fix: Handle 'l' correctly
                                                        displayUnit = (displayUnit === 'l' || displayUnit === 'lt') ? 'L' : 'kg';
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
