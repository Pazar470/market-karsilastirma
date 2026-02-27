
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Category {
    id: string;
    name: string;
}

interface Product {
    id: string;
    name: string;
    tags: string;
}

export default function NewAlarmPage() {
    const router = useRouter();
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

    useEffect(() => {
        fetch('/api/categories?leafOnly=true')
            .then(res => res.json())
            .then(setCategories);
    }, []);

    const handleCatSelect = async (catId: string) => {
        setSelectedCat(catId);
        setStep(2);
        // Fetch products in this category to extract unique tags
        const res = await fetch(`/api/products?categoryId=${catId}`);
        const data = await res.json();
        setProducts(data);

        const tags = new Set<string>();
        data.forEach((p: Product) => {
            const pTags = JSON.parse(p.tags || '[]');
            pTags.forEach((t: string) => tags.add(t));
        });
        setAvailableTags(Array.from(tags));

        // Auto-fill alarm name
        const cat = categories.find(c => c.id === catId);
        if (cat) setName(`${cat.name} Alarmı`);
    };

    const filteredProducts = products.filter(p => {
        if (selectedTags.length === 0) return true;
        const pTags = JSON.parse(p.tags || '[]');
        return selectedTags.some(t => pTags.includes(t));
    });

    const handleSubmit = async () => {
        const res = await fetch('/api/alarms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                categoryId: selectedCat,
                targetPrice,
                unitType,
                tags: selectedTags,
                includedProductIds: includedIds,
                excludedProductIds: excludedIds,
                isAllProducts
            })
        });
        if (res.ok) router.push('/alarms');
    };

    return (
        <div className="min-h-screen bg-[#0f1115] text-white p-8">
            <div className="max-w-3xl mx-auto">
                {/* Progress Bar */}
                <div className="flex justify-between mb-12 relative">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-800 -translate-y-1/2 z-0"></div>
                    {[1, 2, 3, 4].map(s => (
                        <div
                            key={s}
                            className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-500 ${step >= s ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.6)]' : 'bg-gray-900 text-gray-600'
                                }`}
                        >
                            {s}
                        </div>
                    ))}
                </div>

                <div className="bg-[#1a1d23] rounded-3xl p-8 border border-gray-800 shadow-2xl">
                    {/* STEP 1: CATEGORY */}
                    {step === 1 && (
                        <div>
                            <h2 className="text-2xl font-bold mb-6">Hangi kategoriyi takip edelim?</h2>
                            <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => handleCatSelect(cat.id)}
                                        className="p-4 text-left bg-gray-800/50 hover:bg-blue-600/20 hover:border-blue-500/50 border border-transparent rounded-xl transition-all"
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: TAGS */}
                    {step === 2 && (
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Özellikleri filtrele</h2>
                            <p className="text-gray-400 mb-8 text-sm">Sadece belirli özelliklere sahip ürünleri takip edebilirsiniz.</p>

                            <div className="flex flex-wrap gap-3 mb-10">
                                {availableTags.length > 0 ? availableTags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                                        className={`px-4 py-2 rounded-full border transition-all ${selectedTags.includes(tag) ? 'bg-blue-600 border-blue-500 shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                                            }`}
                                    >
                                        {tag}
                                    </button>
                                )) : <p className="text-gray-500 italic">Bu kategoride özel etiket bulunamadı.</p>}
                            </div>

                            <div className="flex justify-between">
                                <button onClick={() => setStep(1)} className="px-6 py-2 text-gray-400 hover:text-white transition-colors">Geri</button>
                                <button onClick={() => setStep(3)} className="px-8 py-2 bg-blue-600 rounded-xl font-bold shadow-lg hover:bg-blue-500 transition-all">İlerler</button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: PRODUCT REFINEMENT (SEEN/UNSEEN) */}
                    {step === 3 && (
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h2 className="text-2xl font-bold">Ürünleri Rafine Et (Seen/Unseen)</h2>
                                    <p className="text-gray-400 text-sm">Filtreye giren {filteredProducts.length} üründen takip etmek istediklerini seç.</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setExcludedIds([]); setIncludedIds(filteredProducts.map(p => p.id)); }}
                                        className="px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold hover:bg-blue-600/30 transition-all"
                                    >
                                        Hepsini Göster (Seen All)
                                    </button>
                                    <button
                                        onClick={() => { setExcludedIds(filteredProducts.map(p => p.id)); setIncludedIds([]); }}
                                        className="px-3 py-1.5 bg-red-600/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold hover:bg-red-600/20 transition-all"
                                    >
                                        Hepsini Gizle (Unseen All)
                                    </button>
                                </div>
                            </div>

                            <div className="mt-8 space-y-6">
                                {/* SEEN LIST */}
                                <div>
                                    <h3 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                                        TAKİP EDİLENLER (SEEN)
                                    </h3>
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {filteredProducts.filter(p => !excludedIds.includes(p.id)).map(product => (
                                            <div
                                                key={product.id}
                                                onClick={() => {
                                                    setExcludedIds(prev => [...prev, product.id]);
                                                    setIncludedIds(prev => prev.filter(id => id !== product.id));
                                                }}
                                                className="p-4 bg-gray-800/60 border border-gray-700 hover:border-blue-500/50 rounded-xl cursor-pointer transition-all flex justify-between items-center group"
                                            >
                                                <span className="text-sm">{product.name}</span>
                                                <span className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-500 font-bold uppercase">Gizle</span>
                                            </div>
                                        ))}
                                        {filteredProducts.filter(p => !excludedIds.includes(p.id)).length === 0 && (
                                            <div className="p-8 border-2 border-dashed border-gray-800 rounded-2xl text-center text-gray-600 text-sm">
                                                Henüz seçili ürün yok. Aşağıdaki listeden ekle.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* UNSEEN LIST */}
                                <div className="pt-4 border-t border-gray-800/50">
                                    <h3 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
                                        GİZLENENLER (UNSEEN)
                                    </h3>
                                    <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar opacity-60">
                                        {filteredProducts.filter(p => excludedIds.includes(p.id)).map(product => (
                                            <div
                                                key={product.id}
                                                onClick={() => {
                                                    setExcludedIds(prev => prev.filter(id => id !== product.id));
                                                    setIncludedIds(prev => [...prev, product.id]);
                                                }}
                                                className="p-3 bg-gray-900/50 border border-gray-800 rounded-xl cursor-pointer hover:border-blue-500/30 transition-all flex justify-between items-center group decoration-gray-700 line-through text-gray-500"
                                            >
                                                <span className="text-xs">{product.name}</span>
                                                <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-blue-500/70 uppercase no-underline">Geri Al</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 mb-8 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isAllProducts}
                                        onChange={e => setIsAllProducts(e.target.checked)}
                                        className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500"
                                    />
                                    <div>
                                        <span className="text-sm font-bold block">Organik Takip: Yeni Ürünleri İzle</span>
                                        <span className="text-xs text-gray-500">Market bu kategoriye yeni bir ürün eklediğinde (taglerle uyumluysa) otomatik takip eder veya size onay sorar.</span>
                                    </div>
                                </label>
                            </div>

                            <div className="flex justify-between">
                                <button onClick={() => setStep(2)} className="px-6 py-2 text-gray-400 hover:text-white transition-colors">Geri</button>
                                <button onClick={() => setStep(4)} className="px-8 py-2 bg-blue-600 rounded-xl font-bold shadow-lg hover:bg-blue-500 transition-all">Son Adım</button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: TARGETS */}
                    {step === 4 && (
                        <div className="space-y-8">
                            <h2 className="text-2xl font-bold mb-6">Hedef ve Limitler</h2>

                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Alarm İsmi</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-[#0f1115] border border-gray-800 rounded-xl p-4 focus:border-blue-500 outline-none transition-all"
                                    placeholder="Örn: Ekonomik Kaşar Takibi"
                                />
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm text-gray-400 mb-2">Hedef Birim Fiyat (₺)</label>
                                    <input
                                        type="number"
                                        value={targetPrice}
                                        onChange={e => setTargetPrice(e.target.value)}
                                        className="w-full bg-[#0f1115] border border-gray-800 rounded-xl p-4 focus:border-blue-500 outline-none transition-all text-xl font-bold"
                                        placeholder="250.00"
                                    />
                                </div>
                                <div className="w-32">
                                    <label className="block text-sm text-gray-400 mb-2">Birim</label>
                                    <select
                                        value={unitType}
                                        onChange={e => setUnitType(e.target.value)}
                                        className="w-full bg-[#0f1115] border border-gray-800 rounded-xl p-4 focus:border-blue-500 outline-none transition-all h-[62px]"
                                    >
                                        <option value="KG">KG</option>
                                        <option value="L">Litre</option>
                                        <option value="ADET">Adet</option>
                                    </select>
                                </div>
                            </div>

                            <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-sm text-blue-300">
                                💡 <strong>İpucu:</strong> Seçtiğiniz kategorideki ürünlerin 1 {unitType} fiyatı belirttiğiniz tutarın altına düştüğünde size haber vereceğiz.
                            </div>

                            <div className="flex justify-between pt-6">
                                <button onClick={() => setStep(3)} className="px-6 py-2 text-gray-400 hover:text-white transition-colors">Geri</button>
                                <button onClick={handleSubmit} className="px-10 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-bold shadow-xl hover:scale-105 transition-all">Alarmı Kur</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
