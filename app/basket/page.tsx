'use client';

import { useBasket } from '@/context/basket-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Minus, ArrowLeft, Share2, ShoppingCart, Filter } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';

export default function BasketPage() {
    const { items, removeItem, updateQuantity, clearBasket, totalItems, addItem } = useBasket();

    const totalPrice = items.reduce((sum, item) => sum + (item.addedPrice * item.quantity), 0);

    const [comparison, setComparison] = useState<any[]>([]);
    const [itemDetails, setItemDetails] = useState<any[]>([]);
    const [loadingComparison, setLoadingComparison] = useState(false);
    const [activeFilter, setActiveFilter] = useState<string>('ALL');

    // Get unique markets from items
    const availableMarkets = useMemo(() => {
        const markets = new Set(items.map(i => i.addedMarket || 'Diğer'));
        return Array.from(markets);
    }, [items]);

    // Filter items based on active selection
    const filteredItems = useMemo(() => {
        if (activeFilter === 'ALL') return items;
        return items.filter(i => (i.addedMarket || 'Diğer') === activeFilter);
    }, [items, activeFilter]);

    useEffect(() => {
        if (items.length > 0) {
            fetchComparison();
        } else {
            setComparison([]);
            setItemDetails([]);
        }
    }, [items]);

    const fetchComparison = async () => {
        setLoadingComparison(true);
        try {
            const res = await fetch('/api/basket/compare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: items.map(i => ({ productId: i.productId, quantity: i.quantity }))
                })
            });
            const data = await res.json();
            if (data.markets) {
                setComparison(data.markets);
            }
            if (data.itemDetails) {
                setItemDetails(data.itemDetails);
            }
        } catch (error) {
            console.error('Failed to compare', error);
        } finally {
            setLoadingComparison(false);
        }
    };

    const handleShare = () => {
        // Group items by market using the "Cheapest" logic or just Current Market
        // User Request: "biz markete göre ayırarak (şok, a101, migros vb.) ona liste marka vb. verelim"

        // Simple strategy: List items currently in basket, grouped by their added market
        const grouped: Record<string, typeof items> = {};
        items.forEach(item => {
            const market = item.addedMarket || 'Diğer';
            if (!grouped[market]) grouped[market] = [];
            grouped[market].push(item);
        });

        let text = "🛒 *Market Alışveriş Listem*\n\n";

        Object.entries(grouped).forEach(([market, marketItems]) => {
            text += `*${market}*\n`;
            marketItems.forEach(item => {
                text += `- ${item.quantity}x ${item.name} (${item.addedPrice.toLocaleString('tr-TR')} ₺)\n`;
            });
            text += "\n";
        });

        text += `\n*Toplam Tahmini Tutar:* ${totalPrice.toLocaleString('tr-TR')} ₺`;
        text += `\n\n_Market Fiyat Karşılaştırma Uygulaması ile oluşturuldu._`;

        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const handleAddAlternative = (alt: any) => {
        addItem({
            productId: alt.productId,
            name: alt.productName,
            imageUrl: alt.imageUrl || '', // Ensure alternatives API returns this or handle it
            addedPrice: alt.price,
            addedMarket: alt.marketName
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-6 w-6" />
                            </Button>
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900">Alışveriş Listem</h1>
                    </div>
                    {items.length > 0 && (
                        <Button className="bg-green-600 hover:bg-green-700 text-white w-full md:w-auto" onClick={handleShare}>
                            <Share2 className="mr-2 h-4 w-4" />
                            WhatsApp ile Paylaş
                        </Button>
                    )}
                </div>

                {items.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-lg shadow-sm">
                        <ShoppingCart className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Listeniz henüz boş.</h2>
                        <p className="text-gray-500 mb-6">En uygun fiyatlı ürünleri eklemeye başlayın.</p>
                        <Link href="/">
                            <Button size="lg">Ürün Ara</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Items List */}
                        <div className="md:col-span-2 space-y-4">
                            {/* Market Filters */}
                            {availableMarkets.length > 1 && (
                                <div className="flex gap-2 pb-2 overflow-x-auto">
                                    <Button
                                        variant={activeFilter === 'ALL' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setActiveFilter('ALL')}
                                        className="rounded-full"
                                    >
                                        Tümü ({items.length})
                                    </Button>
                                    {availableMarkets.map(market => (
                                        <Button
                                            key={market}
                                            variant={activeFilter === market ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setActiveFilter(market)}
                                            className="rounded-full"
                                        >
                                            {market} ({items.filter(i => i.addedMarket === market).length})
                                        </Button>
                                    ))}
                                </div>
                            )}

                            {filteredItems.map((item) => {
                                const details = itemDetails.find(d => d.sourceProductId === item.productId);
                                // Filter alternatives to only show CHEAPER or SAME items from OTHER markets? 
                                // User said: "alternatif seçmek isterse seçtirebilelim"
                                const alternatives = details?.alternatives || [];

                                return (
                                    <Card key={item.productId} className="overflow-hidden border-l-4 border-l-blue-500">
                                        <div className="flex p-4 gap-4">
                                            <div className="h-20 w-20 flex-shrink-0 bg-white border border-gray-100 rounded-md p-1 flex items-center justify-center">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={item.imageUrl} alt={item.name} className="max-h-full max-w-full object-contain mix-blend-multiply" />
                                            </div>
                                            <div className="flex-1 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between items-start">
                                                        <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm md:text-base mr-2" title={item.name}>{item.name}</h3>
                                                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 border whitespace-nowrap">
                                                            {item.addedMarket}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-end mt-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-lg font-bold text-blue-600">
                                                            {item.addedPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                        </span>
                                                        {/* Unit calculation logic could go here */}
                                                    </div>

                                                    <div className="flex items-center bg-gray-50 rounded-lg p-0.5 border">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </Button>
                                                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col justify-start">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-gray-400 hover:text-red-500 -mt-2 -mr-2"
                                                    onClick={() => removeItem(item.productId)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Alternatives Section */}
                                        {alternatives.length > 0 && (
                                            <div className="bg-gray-50/50 border-t px-4 py-2">
                                                <p className="text-[10px] uppercase font-bold text-gray-500 mb-2">Alternatifler:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {alternatives.map((alt: any) => (
                                                        <div key={alt.productId} className="flex items-center gap-2 bg-white border rounded shadow-sm px-2 py-1 text-xs">
                                                            <span className="font-semibold text-gray-700">{alt.marketName}:</span>
                                                            <span className={alt.price < item.addedPrice ? "text-green-600 font-bold" : "text-gray-900"}>
                                                                {alt.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}₺
                                                            </span>
                                                            <button
                                                                className="text-blue-600 hover:text-blue-800 underline ml-1 font-medium"
                                                                onClick={() => handleAddAlternative(alt)}
                                                            >
                                                                + Ekle
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </Card>
                                )
                            })}

                            <div className="flex justify-end pt-4">
                                <Button variant="ghost" className="text-red-500 hover:bg-red-50 text-sm" onClick={clearBasket}>
                                    Listeyi Temizle
                                </Button>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="md:col-span-1">
                            <Card className="sticky top-8 border-t-4 border-t-green-500 shadow-lg">
                                <CardHeader className="pb-3 border-b bg-gray-50/50">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">📊</span>
                                        <CardTitle className="text-base text-gray-900">En Uygun Market</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4">
                                    {/* Comparison Section */}
                                    <div className="space-y-3">
                                        {loadingComparison ? (
                                            <div className="py-4 text-center text-xs text-blue-600 animate-pulse bg-blue-50 rounded">
                                                Fiyatlar analiz ediliyor...
                                            </div>
                                        ) : comparison.length > 0 ? (
                                            comparison.map((market, idx) => (
                                                <div key={market.marketName} className={`p-3 rounded-lg border flex flex-col gap-1 transition-all ${idx === 0 ? 'bg-green-50 border-green-300 ring-1 ring-green-200' : 'bg-white border-gray-200 opacity-80'}`}>
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                                            <span className={`font-bold text-sm ${idx === 0 ? 'text-green-900' : 'text-gray-700'}`}>{market.marketName}</span>
                                                        </div>
                                                        <span className={`font-bold ${idx === 0 ? 'text-green-700 text-lg' : 'text-gray-500'}`}>
                                                            {market.totalPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-[10px] text-gray-500 pl-4">
                                                        <span>{market.foundItems}/{totalItems} ürün bulundu</span>
                                                        {market.missingItems.length > 0 && (
                                                            <span className="text-red-500 font-medium">({market.missingItems.length} eksik)</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-xs text-gray-400 italic text-center py-2">Veri bulunamadı.</div>
                                        )}
                                    </div>

                                    <div className="border-t pt-4 mt-2">
                                        <div className="flex justify-between text-base font-bold mb-4">
                                            <span>Mevcut Toplam</span>
                                            <span className="text-blue-600">
                                                {totalPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                            </span>
                                        </div>
                                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold h-12" onClick={handleShare}>
                                            <Share2 className="mr-2 h-4 w-4" />
                                            Listeyi Paylaş (WhatsApp)
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
