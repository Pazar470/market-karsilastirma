
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Category {
    id: string;
    name: string;
}

interface Product {
    id: string;
    name: string;
    tags: string;
}

export default function EditAlarmPage() {
    const router = useRouter();
    const { id } = useParams();
    const [step, setStep] = useState(1);
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [availableTags, setAvailableTags] = useState<string[]>([]);

    // Selection States
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
                // Load categories
                const catRes = await fetch('/api/categories?leafOnly=true');
                const cats = await catRes.json();
                setCategories(cats);

                // Load Alarm data
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

                    // Load products for this category
                    const prodRes = await fetch(`/api/products?categoryId=${alarm.categoryId}`);
                    const prods = await prodRes.json();
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
        setPendingIds(prev => prev.filter(id => id !== pid));
    };

    const handleRejectPending = (pid: string) => {
        setExcludedIds(prev => [...prev, pid]);
        setPendingIds(prev => prev.filter(id => id !== pid));
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
        <div className="min-h-screen bg-[#0f1115] text-white p-8">
            <div className="max-w-3xl mx-auto">
                <div className="flex justify-between items-center mb-12">
                    <h1 className="text-3xl font-bold">Alarmı Düzenle</h1>
                    <div className="flex gap-4">
                        <button onClick={() => setStep(prev => Math.max(1, prev - 1))} className={`px-4 py-2 bg-gray-800 rounded-lg text-sm ${step === 1 ? 'opacity-30 pointer-events-none' : ''}`}>Geri</button>
                        <button onClick={() => setStep(prev => Math.min(4, prev + 1))} className={`px-4 py-2 bg-blue-600 rounded-lg text-sm font-bold ${step === 4 ? 'opacity-30 pointer-events-none' : ''}`}>İleri</button>
                    </div>
                </div>

                <div className="bg-[#1a1d23] rounded-3xl p-8 border border-gray-800 shadow-2xl">
                    {step === 1 && (
                        <div>
                            <h2 className="text-xl font-bold mb-6">Alarm Detayları</h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Alarm İsmi</label>
                                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#0f1115] border border-gray-800 rounded-xl p-4 focus:border-blue-500 outline-none" />
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-sm text-gray-400 mb-2">Hedef Fiyat (₺)</label>
                                        <input type="number" value={targetPrice} onChange={e => setTargetPrice(e.target.value)} className="w-full bg-[#0f1115] border border-gray-800 rounded-xl p-4 focus:border-blue-500 outline-none" />
                                    </div>
                                    <div className="w-32">
                                        <label className="block text-sm text-gray-400 mb-2">Birim</label>
                                        <div className="p-4 bg-gray-800/50 rounded-xl text-center border border-gray-700">{unitType}</div>
                                    </div>
                                </div>
                                <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" checked={isAllProducts} onChange={e => setIsAllProducts(e.target.checked)} className="w-5 h-5 bg-gray-800 rounded text-blue-600" />
                                        <div>
                                            <span className="text-sm font-bold block">Organik Takip: Yeni Ürünleri İzle</span>
                                            <span className="text-xs text-gray-500">Market yeni ürün eklediğinde onayınıza sunulur.</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div>
                            <h2 className="text-xl font-bold mb-6">Filtreleri Güncelle</h2>
                            <div className="flex flex-wrap gap-3">
                                {availableTags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                                        className={`px-4 py-2 rounded-full border ${selectedTags.includes(tag) ? 'bg-blue-600 border-blue-500' : 'bg-gray-800 border-gray-700'}`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold">Ürün Rafinesi (Seen/Unseen)</h2>
                            </div>

                            <div className="space-y-8">
                                {/* PENDING SECTION */}
                                {pendingIds.length > 0 && (
                                    <div className="p-5 bg-blue-600/10 border border-blue-500/30 rounded-2xl">
                                        <h3 className="text-sm font-bold text-blue-400 mb-4 flex items-center gap-2">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                            </span>
                                            ONAY BEKLEYEN YENİ ÜRÜNLER
                                        </h3>
                                        <div className="space-y-3">
                                            {products.filter(p => pendingIds.includes(p.id)).map(product => (
                                                <div key={product.id} className="flex items-center justify-between p-3 bg-gray-800/80 rounded-xl border border-blue-500/20 shadow-sm">
                                                    <span className="text-sm font-medium">{product.name}</span>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleRejectPending(product.id)}
                                                            className="px-3 py-1 bg-red-600/20 text-red-400 text-xs font-bold rounded-lg hover:bg-red-600/30"
                                                        >
                                                            Gizle
                                                        </button>
                                                        <button
                                                            onClick={() => handleAcceptPending(product.id)}
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
                                        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Takip Edilenler</h3>
                                        <button onClick={() => { setExcludedIds(products.map(p => p.id)); setIncludedIds([]); }} className="text-[10px] text-gray-500 hover:text-red-400 uppercase font-bold">Hepsini Gizle</button>
                                    </div>
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {filteredProducts.filter(p => !excludedIds.includes(p.id) && !pendingIds.includes(p.id)).map(product => (
                                            <div key={product.id} onClick={() => setExcludedIds(prev => [...prev, product.id])} className="p-3 bg-gray-800/60 border border-gray-700 rounded-lg cursor-pointer hover:border-blue-500/50 flex justify-between items-center group">
                                                <span className="text-sm">{product.name}</span>
                                                <span className="text-[10px] text-gray-600 opacity-0 group-hover:opacity-100 uppercase font-bold">Gizle</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-800/50">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Gizlenenler</h3>
                                        <button onClick={() => { setExcludedIds([]); setIncludedIds(products.map(p => p.id)); }} className="text-[10px] text-gray-500 hover:text-blue-400 uppercase font-bold">Hepsini Göster</button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 opacity-60">
                                        {filteredProducts.filter(p => excludedIds.includes(p.id) && !pendingIds.includes(p.id)).map(product => (
                                            <div key={product.id} onClick={() => setExcludedIds(prev => prev.filter(id => id !== product.id))} className="p-2 bg-gray-900/50 border border-gray-800 rounded-lg cursor-pointer flex justify-between items-center group line-through">
                                                <span className="text-xs text-gray-500">{product.name}</span>
                                                <span className="text-[10px] text-blue-500 opacity-0 group-hover:opacity-100 uppercase font-bold no-underline">Geri Al</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="text-center p-10">
                            <h2 className="text-2xl font-bold mb-4">Değişiklikleri Kaydet</h2>
                            <p className="text-gray-400 mb-10">Alarm ayarlarınız organik bir şekilde güncellenecek.</p>
                            <button onClick={handleSubmit} className="px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-bold shadow-xl hover:scale-105 transition-all">
                                Güncellemeleri Onayla
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
