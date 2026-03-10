'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AlarmEditProductCard, type AlarmEditProduct } from '@/components/alarm-edit-product-card';
import { FollowButton } from '@/components/follow-button';
import { AddToBasketButton } from '@/components/add-to-basket-button';
import { getUnitPrice } from '@/lib/unit-price';

interface Category {
    id: string;
    name: string;
}

type TabId = 'sonuclar' | 'ayarlar';

function productUnitPrice(p: AlarmEditProduct): number | null {
    const priceInfo = p.prices?.[0];
    if (!priceInfo) return null;
    const price = priceInfo.campaignAmount != null ? parseFloat(priceInfo.campaignAmount) : parseFloat(priceInfo.amount);
    const { value } = getUnitPrice(price, p.quantityAmount, p.quantityUnit);
    return value;
}

export default function EditAlarmPage() {
    const router = useRouter();
    const { id } = useParams();
    const [activeTab, setActiveTab] = useState<TabId>('sonuclar');

    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<AlarmEditProduct[]>([]);
    const [availableTags, setAvailableTags] = useState<string[]>([]);

    const [selectedCat, setSelectedCat] = useState<string>('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [excludedIds, setExcludedIds] = useState<string[]>([]);
    const [includedIds, setIncludedIds] = useState<string[]>([]);
    const [name, setName] = useState('');
    const [targetPrice, setTargetPrice] = useState('');
    const [savedTargetPrice, setSavedTargetPrice] = useState('');
    const [unitType, setUnitType] = useState('KG');
    const [isAllProducts, setIsAllProducts] = useState(true);
    const [pendingIds, setPendingIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {
                const catRes = await fetch('/api/categories?leafOnly=true');
                const cats = await catRes.json();
                setCategories(cats);

                const alarmRes = await fetch(`/api/alarms/${id}`);
                if (alarmRes.ok) {
                    const alarm = await alarmRes.json();
                    setName(alarm.name);
                    setSelectedCat(alarm.categoryId);
                    const tp = alarm.targetPrice?.toString() ?? '';
                    setTargetPrice(tp);
                    setSavedTargetPrice(tp);
                    setUnitType(alarm.unitType || 'KG');
                    setSelectedTags(alarm.tags || []);
                    setIncludedIds(alarm.includedProductIds || []);
                    setExcludedIds(alarm.excludedProductIds || []);
                    setPendingIds(alarm.pendingProductIds || []);
                    setIsAllProducts(alarm.isAllProducts ?? true);

                    const prodRes = await fetch(`/api/products?categoryId=${alarm.categoryId}`);
                    const prodsData = await prodRes.json();
                    const prods = Array.isArray(prodsData) ? prodsData : (prodsData?.products ?? []);
                    setProducts(prods);

                    const tags = new Set<string>();
                    prods.forEach((p: AlarmEditProduct & { tags?: string }) => {
                        try {
                            const pTags = JSON.parse(p.tags || '[]');
                            pTags.forEach((t: string) => tags.add(t));
                        } catch (_) {}
                    });
                    setAvailableTags(Array.from(tags));
                }
            } catch (error) {
                console.error('Initialization error:', error);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [id]);

    const targetNum = parseFloat(targetPrice.replace(',', '.')) || 0;
    const priceChanged = targetPrice !== '' && targetPrice !== savedTargetPrice;

    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            if (selectedTags.length === 0) return true;
            try {
                const raw = (p as AlarmEditProduct & { tags?: string }).tags;
                const pTags = typeof raw === 'string' ? JSON.parse(raw || '[]') : [];
                return Array.isArray(pTags) && selectedTags.some((t) => pTags.includes(t));
            } catch {
                return false;
            }
        });
    }, [products, selectedTags]);

    const { meeting, notMeeting, hidden } = useMemo(() => {
        const meeting: AlarmEditProduct[] = [];
        const notMeeting: AlarmEditProduct[] = [];
        const hidden: AlarmEditProduct[] = [];
        filteredProducts.forEach((p) => {
            const up = productUnitPrice(p);
            const isExcluded = excludedIds.includes(p.id);
            const isPending = pendingIds.includes(p.id);
            if (isExcluded) {
                hidden.push(p);
                return;
            }
            if (up !== null && up <= targetNum) {
                meeting.push(p);
            } else {
                notMeeting.push(p);
            }
        });
        meeting.sort((a, b) => (productUnitPrice(a) ?? 0) - (productUnitPrice(b) ?? 0));
        return { meeting, notMeeting, hidden };
    }, [filteredProducts, excludedIds, pendingIds, targetNum]);

    const handleAcceptPending = (pid: string) => {
        setIncludedIds((prev) => [...prev, pid]);
        setPendingIds((prev) => prev.filter((x) => x !== pid));
    };

    const handleRejectPending = (pid: string) => {
        setExcludedIds((prev) => [...prev, pid]);
        setPendingIds((prev) => prev.filter((x) => x !== pid));
    };

    const handleSavePrice = async () => {
        if (priceChanged && targetPrice !== '') {
            setSaving(true);
            try {
                const res = await fetch(`/api/alarms/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        targetPrice: parseFloat(targetPrice.replace(',', '.')),
                        name,
                        tags: JSON.stringify(selectedTags),
                        includedProductIds: JSON.stringify(includedIds),
                        excludedProductIds: JSON.stringify(excludedIds),
                        pendingProductIds: JSON.stringify(pendingIds),
                        isAllProducts,
                    }),
                });
                if (res.ok) {
                    setSavedTargetPrice(targetPrice);
                }
            } finally {
                setSaving(false);
            }
        }
    };

    const handleSubmit = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/alarms/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    targetPrice: parseFloat(targetPrice.replace(',', '.')) || 0,
                    tags: JSON.stringify(selectedTags),
                    includedProductIds: JSON.stringify(includedIds),
                    excludedProductIds: JSON.stringify(excludedIds),
                    pendingProductIds: JSON.stringify(pendingIds),
                    isAllProducts,
                }),
            });
            if (res.ok) {
                setSavedTargetPrice(targetPrice);
                router.push('/alarms');
            }
        } finally {
                setSaving(false);
        }
    };

    const gridClass = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3';

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4">
                {/* Üst: alarm adı + sağda hedef fiyat + Alarmı yeniden kur */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <h1 className="text-xl font-semibold truncate">{name || 'Alarmı Düzenle'}</h1>
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="text-xs text-gray-500 font-medium">Hedef birim fiyat (₺)</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={targetPrice}
                            onChange={(e) => setTargetPrice(e.target.value)}
                            className="w-24 h-9 px-2 rounded-lg border border-gray-200 text-sm font-medium"
                        />
                        <span className="text-sm text-gray-500">/ {unitType}</span>
                        {priceChanged ? (
                            <button
                                type="button"
                                onClick={handleSavePrice}
                                disabled={saving}
                                className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                            >
                                Alarmı yeniden kur
                            </button>
                        ) : null}
                    </div>
                </div>

                {/* Tab bar */}
                <div className="flex rounded-lg overflow-hidden border border-gray-200 bg-white mb-4">
                    <button
                        type="button"
                        onClick={() => setActiveTab('sonuclar')}
                        className={cn(
                            'flex-1 py-2.5 px-4 text-sm font-medium transition-colors',
                            activeTab === 'sonuclar' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                        )}
                    >
                        Sonuçlar
                        {pendingIds.length > 0 && (
                            <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-blue-500/80 text-[10px] font-bold">
                                {pendingIds.length}
                            </span>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('ayarlar')}
                        className={cn(
                            'flex-1 py-2.5 px-4 text-sm font-medium transition-colors',
                            activeTab === 'ayarlar' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                        )}
                    >
                        Ayarlar
                    </button>
                </div>

                {activeTab === 'sonuclar' && (
                    <div className="space-y-6">
                        {/* 1. Hedef fiyatı karşılayan ürünler */}
                        <section>
                            <h2 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                Hedef fiyatı karşılayan ürünler ({meeting.length})
                            </h2>
                            <div className={gridClass}>
                                {meeting.map((product) => {
                                    const priceInfo = product.prices?.[0];
                                    const price = priceInfo
                                        ? (priceInfo.campaignAmount != null ? parseFloat(String(priceInfo.campaignAmount)) : parseFloat(String(priceInfo.amount)))
                                        : 0;
                                    return (
                                        <AlarmEditProductCard
                                            key={product.id}
                                            product={product}
                                            actions={
                                                <>
                                                    <FollowButton productId={product.id} categoryId={selectedCat} className="h-7 w-7 shrink-0" />
                                                    {pendingIds.includes(product.id) ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRejectPending(product.id)}
                                                                className="h-7 min-w-[52px] px-2 rounded-md bg-red-100 text-red-700 text-[10px] font-bold hover:bg-red-200"
                                                            >
                                                                Gizle
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAcceptPending(product.id)}
                                                                className="h-7 min-w-[52px] px-2 rounded-md bg-green-100 text-green-700 text-[10px] font-bold hover:bg-green-200"
                                                            >
                                                                Takibe Al
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => setExcludedIds((prev) => [...prev, product.id])}
                                                            className="h-7 min-w-[52px] px-2 rounded-md bg-gray-100 text-gray-700 text-[10px] font-bold hover:bg-gray-200"
                                                        >
                                                            Gizle
                                                        </button>
                                                    )}
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
                                                </>
                                            }
                                        />
                                    );
                                })}
                            </div>
                        </section>

                        {/* 2. Hedef fiyatın altına düşmemiş ürünler */}
                        <section>
                            <h2 className="text-sm font-bold text-gray-700 mb-2">
                                Hedef fiyatın altına düşmemiş ürünler ({notMeeting.length})
                            </h2>
                            <div className={gridClass}>
                                {notMeeting.map((product) => {
                                    const priceInfo = product.prices?.[0];
                                    const price = priceInfo
                                        ? (priceInfo.campaignAmount != null ? parseFloat(String(priceInfo.campaignAmount)) : parseFloat(String(priceInfo.amount)))
                                        : 0;
                                    return (
                                        <AlarmEditProductCard
                                            key={product.id}
                                            product={product}
                                            actions={
                                                <>
                                                    <FollowButton productId={product.id} categoryId={selectedCat} className="h-7 w-7 shrink-0" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setExcludedIds((prev) => [...prev, product.id])}
                                                        className="h-7 min-w-[52px] px-2 rounded-md bg-gray-100 text-gray-700 text-[10px] font-bold hover:bg-gray-200"
                                                    >
                                                        Gizle
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
                                                </>
                                            }
                                        />
                                    );
                                })}
                            </div>
                        </section>

                        {/* 3. Gizlenen ürünler - dinamik, göster/gizle */}
                        <section>
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-sm font-bold text-gray-500">Gizlenen ürünler ({hidden.length})</h2>
                                {hidden.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setExcludedIds([]);
                                            setIncludedIds(products.map((p) => p.id));
                                        }}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-800"
                                    >
                                        Tümünü göster
                                    </button>
                                )}
                            </div>
                            <div className={gridClass}>
                                {hidden.map((product) => {
                                    const priceInfo = product.prices?.[0];
                                    const price = priceInfo
                                        ? (priceInfo.campaignAmount != null ? parseFloat(String(priceInfo.campaignAmount)) : parseFloat(String(priceInfo.amount)))
                                        : 0;
                                    return (
                                        <AlarmEditProductCard
                                            key={product.id}
                                            product={product}
                                            actions={
                                                <>
                                                    <FollowButton productId={product.id} categoryId={selectedCat} className="h-7 w-7 shrink-0" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setExcludedIds((prev) => prev.filter((x) => x !== product.id))}
                                                        className="h-7 min-w-[52px] px-2 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold hover:bg-blue-200"
                                                    >
                                                        Göster
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
                                                </>
                                            }
                                        />
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'ayarlar' && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Alarm ismi</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hedef birim fiyat (₺) / Birim</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={targetPrice}
                                    onChange={(e) => setTargetPrice(e.target.value)}
                                    className="flex-1 max-w-[120px] h-10 px-3 rounded-lg border border-gray-200 text-sm"
                                />
                                <span className="flex items-center text-sm text-gray-500">{unitType}</span>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Etiket filtresi</h3>
                            <div className="flex flex-wrap gap-2">
                                {availableTags.map((tag) => (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() =>
                                            setSelectedTags((prev) =>
                                                prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                                            )
                                        }
                                        className={cn(
                                            'px-3 py-1.5 rounded-full border text-sm',
                                            selectedTags.includes(tag)
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                                        )}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isAllProducts}
                                    onChange={(e) => setIsAllProducts(e.target.checked)}
                                    className="w-4 h-4 rounded text-blue-600"
                                />
                                <div>
                                    <span className="text-sm font-medium block">Organik takip: Yeni ürünleri izle</span>
                                    <span className="text-xs text-gray-500">Market yeni ürün eklediğinde onayınıza sunulur.</span>
                                </div>
                            </label>
                        </div>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={saving}
                            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            Değişiklikleri kaydet
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
