'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Category {
    id: string;
    name: string;
}

interface Product {
    id: string;
    name: string;
    tags: string;
}

type TabId = 'sonuclar' | 'ayarlar';

export default function EditAlarmPage() {
    const router = useRouter();
    const { id } = useParams();
    const [activeTab, setActiveTab] = useState<TabId>('sonuclar');

    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [availableTags, setAvailableTags] = useState<string[]>([]);

    const [selectedCat, setSelectedCat] = useState<string>('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [excludedIds, setExcludedIds] = useState<string[]>([]);
    const [includedIds, setIncludedIds] = useState<string[]>([]);
    const [name, setName] = useState('');
    const [targetPrice, setTargetPrice] = useState('');
    const [unitType, setUnitType] = useState('KG');
    const [isAllProducts, setIsAllProducts] = useState(true);
    const [pendingIds, setPendingIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

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
                    setTargetPrice(alarm.targetPrice.toString());
                    setUnitType(alarm.unitType);
                    setSelectedTags(alarm.tags || []);
                    setIncludedIds(alarm.includedProductIds || []);
                    setExcludedIds(alarm.excludedProductIds || []);
                    setPendingIds(alarm.pendingProductIds || []);

                    setIsAllProducts(alarm.isAllProducts);

                    const prodRes = await fetch(`/api/products?categoryId=${alarm.categoryId}`);
                    const prodsData = await prodRes.json();
                    const prods = Array.isArray(prodsData) ? prodsData : (prodsData?.products ?? []);
                    setProducts(prods);

                    const tags = new Set<string>();
                    prods.forEach((p: Product) => {
                        const pTags = JSON.parse(p.tags || '[]');
                        pTags.forEach((t: string) => tags.add(t));
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

    const handleAcceptPending = (pid: string) => {
        setIncludedIds(prev => [...prev, pid]);
        setPendingIds(prev => prev.filter(x => x !== pid));
    };

    const handleRejectPending = (pid: string) => {
        setExcludedIds(prev => [...prev, pid]);
        setPendingIds(prev => prev.filter(x => x !== pid));
    };

    const filteredProducts = products.filter(p => {
        if (selectedTags.length === 0) return true;
        const pTags = JSON.parse(p.tags || '[]');
        return selectedTags.some(t => pTags.includes(t));
    });

    const handleSubmit = async () => {
        const res = await fetch(`/api/alarms/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                targetPrice,
                tags: JSON.stringify(selectedTags),
                includedProductIds: JSON.stringify(includedIds),
                excludedProductIds: JSON.stringify(excludedIds),
                pendingProductIds: JSON.stringify(pendingIds),
                isAllProducts
            })
        });
        if (res.ok) router.push('/alarms');
    };

    if (loading) return <div className="min-h-screen bg-[#0f1115] flex items-center justify-center text-blue-500">Yükleniyor...</div>;

    return (
        <div className="min-h-screen bg-[#0f1115] text-white p-6 sm:p-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-2xl sm:text-3xl font-bold mb-6">Alarmı Düzenle</h1>

                {/* Tab bar */}
                <div className="flex rounded-t-xl overflow-hidden border border-b-0 border-gray-800 bg-[#1a1d23] mb-0">
                    <button
                        type="button"
                        onClick={() => setActiveTab('sonuclar')}
                        className={cn(
                            'flex-1 py-3 px-4 text-sm font-semibold transition-colors',
                            activeTab === 'sonuclar'
                                ? 'bg-blue-600 text-white'
                                : 'bg-[#1a1d23] text-gray-400 hover:text-white hover:bg-gray-800/50'
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
                            'flex-1 py-3 px-4 text-sm font-semibold transition-colors',
                            activeTab === 'ayarlar'
                                ? 'bg-blue-600 text-white'
                                : 'bg-[#1a1d23] text-gray-400 hover:text-white hover:bg-gray-800/50'
                        )}
                    >
                        Ayarlar
                    </button>
                </div>

                <div className="bg-[#1a1d23] rounded-b-3xl rounded-tr-3xl p-6 sm:p-8 border border-gray-800 border-t-0 shadow-2xl">
                    {activeTab === 'sonuclar' && (
                        <div className="space-y-8">
                            {pendingIds.length > 0 && (
                                <div className="p-5 bg-blue-600/10 border border-blue-500/30 rounded-2xl">
                                    <h3 className="text-sm font-bold text-blue-400 mb-4 flex items-center gap-2">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                                        </span>
                                        Alarm koşulunu karşılayan yeni ürünler
                                    </h3>
                                    <div className="space-y-3">
                                        {products.filter(p => pendingIds.includes(p.id)).map(product => (
                                            <div key={product.id} className="flex items-center justify-between gap-2 p-3 bg-gray-800/80 rounded-xl border border-blue-500/20">
                                                <Link
                                                    href={`/product/${product.id}`}
                                                    className="text-sm font-medium text-white hover:text-blue-300 flex-1 min-w-0 truncate"
                                                >
                                                    {product.name}
                                                </Link>
                                                <div className="flex gap-2 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.preventDefault(); handleRejectPending(product.id); }}
                                                        className="px-3 py-1 bg-red-600/20 text-red-400 text-xs font-bold rounded-lg hover:bg-red-600/30"
                                                    >
                                                        Gizle
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.preventDefault(); handleAcceptPending(product.id); }}
                                                        className="px-3 py-1 bg-green-600/20 text-green-400 text-xs font-bold rounded-lg hover:bg-green-600/30"
                                                    >
                                                        Takibe Al
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Takip Edilen Ürünler</h3>
                                    <button
                                        type="button"
                                        onClick={() => { setExcludedIds(products.map(p => p.id)); setIncludedIds([]); }}
                                        className="text-[10px] text-gray-500 hover:text-red-400 uppercase font-bold"
                                    >
                                        Tümünü Gizle
                                    </button>
                                </div>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {filteredProducts.filter(p => !excludedIds.includes(p.id) && !pendingIds.includes(p.id)).map(product => (
                                        <div
                                            key={product.id}
                                            className="p-3 bg-gray-800/60 border border-gray-700 rounded-lg hover:border-blue-500/50 flex justify-between items-center gap-2 group"
                                        >
                                            <Link
                                                href={`/product/${product.id}`}
                                                className="text-sm text-white hover:text-blue-300 flex-1 min-w-0 truncate"
                                            >
                                                {product.name}
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => setExcludedIds(prev => [...prev, product.id])}
                                                className="text-[10px] text-gray-500 hover:text-red-400 uppercase font-bold shrink-0"
                                            >
                                                Gizle
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-800/50">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Gizlenen Ürünler</h3>
                                    <button
                                        type="button"
                                        onClick={() => { setExcludedIds([]); setIncludedIds(products.map(p => p.id)); }}
                                        className="text-[10px] text-gray-500 hover:text-blue-400 uppercase font-bold"
                                    >
                                        Tümünü Göster
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 opacity-60">
                                    {filteredProducts.filter(p => excludedIds.includes(p.id) && !pendingIds.includes(p.id)).map(product => (
                                        <div
                                            key={product.id}
                                            className="p-2 bg-gray-900/50 border border-gray-800 rounded-lg flex justify-between items-center gap-2 group line-through"
                                        >
                                            <Link
                                                href={`/product/${product.id}`}
                                                className="text-xs text-gray-500 hover:text-blue-400 flex-1 min-w-0 truncate no-underline"
                                            >
                                                {product.name}
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => setExcludedIds(prev => prev.filter(x => x !== product.id))}
                                                className="text-[10px] text-blue-500 hover:text-blue-400 uppercase font-bold shrink-0"
                                            >
                                                Geri Al
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'ayarlar' && (
                        <div className="space-y-8">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Alarm İsmi</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-[#0f1115] border border-gray-800 rounded-xl p-4 focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm text-gray-400 mb-2">Hedef Birim Fiyat (₺)</label>
                                    <input
                                        type="number"
                                        value={targetPrice}
                                        onChange={e => setTargetPrice(e.target.value)}
                                        className="w-full bg-[#0f1115] border border-gray-800 rounded-xl p-4 focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <div className="w-32">
                                    <label className="block text-sm text-gray-400 mb-2">Birim</label>
                                    <div className="p-4 bg-gray-800/50 rounded-xl text-center border border-gray-700">{unitType}</div>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-300 mb-3">Etiket filtresi</h3>
                                <div className="flex flex-wrap gap-3">
                                    {availableTags.map(tag => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                                            className={cn(
                                                'px-4 py-2 rounded-full border text-sm',
                                                selectedTags.includes(tag) ? 'bg-blue-600 border-blue-500' : 'bg-gray-800 border-gray-700'
                                            )}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isAllProducts}
                                        onChange={e => setIsAllProducts(e.target.checked)}
                                        className="w-5 h-5 bg-gray-800 rounded text-blue-600"
                                    />
                                    <div>
                                        <span className="text-sm font-bold block">Organik Takip: Yeni Ürünleri İzle</span>
                                        <span className="text-xs text-gray-500">Market yeni ürün eklediğinde onayınıza sunulur.</span>
                                    </div>
                                </label>
                            </div>
                            <div className="pt-4">
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-bold shadow-xl hover:scale-[1.02] transition-transform"
                                >
                                    Değişiklikleri Kaydet
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
