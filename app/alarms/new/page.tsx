
'use client';

import React, { Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { ProductImage } from '@/components/product-image';

interface Category {
    id: string;
    name: string;
}

/** Ağaç düğümü (api/categories/tree). */
interface TreeNode {
    id: string;
    name: string;
    children?: TreeNode[];
}

/** Düz liste öğesi: arama ve gruplu göstermek için path + seviye. */
interface CategoryOption {
    id: string;
    name: string;
    pathLabel: string;
    level: number; // 0=ana, 1=yaprak, 2=ince
}

interface PriceInfo {
    amount: string;
    campaignAmount?: string | null;
    currency: string;
    market: { name: string };
}
interface Product {
    id: string;
    name: string;
    tags: string;
    imageUrl?: string | null;
    categoryId?: string | null;
    masterCategory?: { id: string; name: string } | null;
    quantityAmount?: number | null;
    quantityUnit?: string | null;
    prices?: PriceInfo[];
}

function formatUnitPrice(product: Product, priceInfo: PriceInfo): string {
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
}

function AlarmProductCard({
    product,
    variant,
    onToggle,
    icon,
    iconTitle,
}: {
    product: Product;
    variant: 'seen' | 'unseen';
    onToggle: () => void;
    icon: React.ReactNode;
    iconTitle: string;
}) {
    const priceInfo = product.prices?.[0];
    const price = priceInfo ? (priceInfo.campaignAmount != null ? parseFloat(priceInfo.campaignAmount) : parseFloat(priceInfo.amount)) : null;
    const isUnseen = variant === 'unseen';
    return (
        <div className={`rounded-xl border overflow-hidden bg-gray-800/80 transition-all ${isUnseen ? 'border-gray-700' : 'border-gray-700 hover:border-blue-500/50'}`}>
            <div className="aspect-square relative flex items-center justify-center p-4 bg-gray-900/50">
                <ProductImage src={product.imageUrl} alt={product.name} className="max-h-full max-w-full object-contain" />
                {priceInfo && (
                    <div className="absolute top-2 right-2">
                        <span className="bg-green-600/90 text-white text-xs font-bold px-2 py-1 rounded-full">
                            {formatUnitPrice(product, priceInfo)}
                        </span>
                    </div>
                )}
                <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
                    className={`absolute bottom-2 right-2 p-2 rounded-full text-white transition-colors ${isUnseen ? 'bg-black/60 hover:bg-blue-600/90' : 'bg-black/60 hover:bg-red-600/90'}`}
                    title={iconTitle}
                >
                    {icon}
                </button>
            </div>
            <div className="p-3">
                <div className="text-xs font-semibold text-blue-400 mb-1">{priceInfo?.market?.name || '—'}</div>
                <p className="text-sm font-medium text-white line-clamp-2 min-h-[2.5rem]" title={product.name}>{product.name}</p>
                {price != null && (
                    <div className="text-lg font-bold text-white mt-2">
                        {price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                    </div>
                )}
            </div>
        </div>
    );
}

function NewAlarmPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const categoryIdFromUrl = searchParams.get('categoryId');
    const [step, setStep] = useState(1);
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryTree, setCategoryTree] = useState<TreeNode[]>([]);
    const [categorySearch, setCategorySearch] = useState('');
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
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [productSearchQuery, setProductSearchQuery] = useState('');
    const [productSearchResults, setProductSearchResults] = useState<Product[]>([]);
    const [productSearchLoading, setProductSearchLoading] = useState(false);

    useEffect(() => {
        fetch('/api/categories?leafOnly=true')
            .then(res => res.json())
            .then((data) => setCategories(Array.isArray(data) ? data : []));
        fetch('/api/categories/tree')
            .then(res => res.json())
            .then((data) => setCategoryTree(Array.isArray(data) ? data : []));
    }, []);

    useEffect(() => {
        const q = productSearchQuery.trim();
        if (q.length < 2) {
            setProductSearchResults([]);
            return;
        }
        const t = setTimeout(() => {
            setProductSearchLoading(true);
            fetch(`/api/products?q=${encodeURIComponent(q)}`)
                .then((res) => res.json())
                .then((data) => {
                    const list = Array.isArray(data) ? data : (data?.products ?? []);
                    setProductSearchResults(list.slice(0, 12));
                })
                .catch(() => setProductSearchResults([]))
                .finally(() => setProductSearchLoading(false));
        }, 300);
        return () => clearTimeout(t);
    }, [productSearchQuery]);

    // Ağaçtan düz liste: her düğüm için pathLabel ve level (0=ana, 1=yaprak, 2=ince). Ağaç yoksa leaf listesinden tek seviye. (useEffect'ten önce tanımlanmalı.)
    const categoryOptions = useMemo(() => {
        if (categoryTree.length > 0) {
            const out: CategoryOption[] = [];
            function walk(nodes: TreeNode[], path: string[], level: number) {
                for (const n of nodes) {
                    const name = (n.name || '').trim() || 'Diğer';
                    const pathLabel = path.length ? `${path.join(' > ')} > ${name}` : name;
                    out.push({ id: n.id, name, pathLabel, level });
                    if (n.children?.length) walk(n.children, [...path, name], level + 1);
                }
            }
            walk(categoryTree, [], 0);
            return out;
        }
        return categories.map((c) => ({ id: c.id, name: c.name, pathLabel: c.name, level: 0 }));
    }, [categoryTree, categories]);

    const filteredCategoryOptions = useMemo(() => {
        if (!categorySearch.trim()) return categoryOptions;
        const q = categorySearch.trim().toLowerCase();
        const matched = categoryOptions.filter(
            (c) => c.name.toLowerCase().includes(q) || c.pathLabel.toLowerCase().includes(q)
        );
        return matched.sort((a, b) => a.level - b.level || a.pathLabel.localeCompare(b.pathLabel));
    }, [categoryOptions, categorySearch]);

    const groupedByLevel = useMemo(() => {
        const ana: CategoryOption[] = [];
        const yaprak: CategoryOption[] = [];
        const ince: CategoryOption[] = [];
        for (const c of filteredCategoryOptions) {
            if (c.level === 0) ana.push(c);
            else if (c.level === 1) yaprak.push(c);
            else ince.push(c);
        }
        return { ana, yaprak, ince };
    }, [filteredCategoryOptions]);

    const appliedUrlCat = useRef(false);
    useEffect(() => {
        if (appliedUrlCat.current || !categoryIdFromUrl || step !== 1) return;
        const opts = categoryOptions.length > 0 ? categoryOptions : categories.map(c => ({ id: c.id, name: c.name, pathLabel: c.name, level: 0 }));
        const exists = opts.some((c: { id: string }) => c.id === categoryIdFromUrl);
        if (exists) {
            appliedUrlCat.current = true;
            setSelectedCat(categoryIdFromUrl);
            setStep(2);
            fetch(`/api/products?categoryId=${categoryIdFromUrl}`)
                .then(res => res.json())
                .then(data => {
                    const list = Array.isArray(data) ? data : (data?.products || []);
                    setProducts(list);
                    const opt = opts.find((c: { id: string }) => c.id === categoryIdFromUrl) as { name: string; pathLabel?: string } | undefined;
                    const pathLabel = opt?.pathLabel ?? opt?.name ?? '';
                    setAvailableTags(buildFilteredTags(list, pathLabel));
                    if (opt) setName(`${opt.name} Alarmı`);
                });
        }
    }, [categoryIdFromUrl, categoryOptions, categories, step]);

    const buildFilteredTags = (list: Product[], categoryPathLabel: string) => {
        const count: Record<string, number> = {};
        list.forEach((p: Product) => {
            try {
                const pTags = JSON.parse(p.tags || '[]');
                if (Array.isArray(pTags)) pTags.forEach((t: string) => { count[t] = (count[t] || 0) + 1; });
            } catch (_) {}
        });
        const pathLower = categoryPathLabel.toLowerCase();
        const isPeynirCategory = pathLower.includes('kaşar') || pathLower.includes('peynir');
        return Object.entries(count)
            .filter(([, n]) => n >= 2)
            .filter(([tag]) => {
                if (!isPeynirCategory) return true;
                const t = tag.toLowerCase();
                if (t.includes('zeytin') || t === 'toz') return false;
                return true;
            })
            .map(([tag]) => tag)
            .sort((a, b) => (count[b] ?? 0) - (count[a] ?? 0));
    };

    const handleCatSelect = async (catId: string) => {
        setSelectedCat(catId);
        setStep(2);
        const res = await fetch(`/api/products?categoryId=${catId}`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.products || []);
        setProducts(list);

        const opt = categoryOptions.find(c => c.id === catId) || categories.find(c => c.id === catId);
        const pathLabel: string = opt ? String('pathLabel' in opt ? opt.pathLabel : (opt as Category).name) : '';
        setAvailableTags(buildFilteredTags(list, pathLabel));

        if (opt) setName(`${'name' in opt ? opt.name : (opt as Category).name} Alarmı`);
    };

    const productList = Array.isArray(products) ? products : [];
    const filteredProducts = productList.filter(p => {
        if (selectedTags.length === 0) return true;
        try {
            const pTags = JSON.parse(p.tags || '[]');
            return Array.isArray(pTags) && selectedTags.some(t => pTags.includes(t));
        } catch (_) {
            return false;
        }
    });

    const handleSubmit = async () => {
        setSubmitError(null);
        if (!name?.trim()) {
            setSubmitError('Alarm ismi girin.');
            return;
        }
        if (!selectedCat) {
            setSubmitError('Kategori seçin.');
            return;
        }
        const price = parseFloat(String(targetPrice).replace(',', '.'));
        if (Number.isNaN(price) || price < 0) {
            setSubmitError('Geçerli bir hedef birim fiyat girin.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch('/api/alarms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    categoryId: selectedCat,
                    targetPrice: price,
                    unitType,
                    tags: selectedTags,
                    includedProductIds: includedIds,
                    excludedProductIds: excludedIds,
                    isAllProducts
                })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setSubmitError((data as { error?: string }).error || `Hata (${res.status}). Tekrar deneyin.`);
                return;
            }
            router.push('/alarms');
        } finally {
            setSubmitting(false);
        }
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
                            <p className="text-xs text-gray-500 mb-3">Kategorilerdeki oluşabilecek yanlışlıklar marketlerin kendi kategorilerinden kaynaklanabilir.</p>
                            <p className="text-xs text-amber-500/90 mb-3 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">Beta’da alarm kurmak için kullanıcı adı ve PIN zorunlu olacak. MVP’de kayıt olmadan alarm kurulamayacak; bu uyarı mesajında da gösterilecek.</p>
                            <input
                                type="search"
                                placeholder="Kategori ara..."
                                value={categorySearch}
                                onChange={e => setCategorySearch(e.target.value)}
                                className="w-full bg-[#0f1115] border border-gray-800 rounded-xl p-3 mb-4 focus:border-blue-500 outline-none text-white placeholder:text-gray-500"
                            />
                            <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {filteredCategoryOptions.length === 0 ? (
                                    <p className="text-gray-500 py-4">Kategori bulunamadı.</p>
                                ) : (
                                    <>
                                        {groupedByLevel.ana.length > 0 && (
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0 bg-[#1a1d23] py-1">Ana kategoriler</p>
                                                {groupedByLevel.ana.map(c => (
                                                    <button key={c.id} onClick={() => handleCatSelect(c.id)} className="w-full p-4 text-left bg-gray-800/50 hover:bg-blue-600/20 hover:border-blue-500/50 border border-transparent rounded-xl transition-all">
                                                        {c.pathLabel}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {groupedByLevel.yaprak.length > 0 && (
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0 bg-[#1a1d23] py-1">Yaprak kategoriler</p>
                                                {groupedByLevel.yaprak.map(c => (
                                                    <button key={c.id} onClick={() => handleCatSelect(c.id)} className="w-full p-4 text-left bg-gray-800/50 hover:bg-blue-600/20 hover:border-blue-500/50 border border-transparent rounded-xl transition-all">
                                                        {c.pathLabel}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {groupedByLevel.ince.length > 0 && (
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0 bg-[#1a1d23] py-1">İnce yaprak kategoriler</p>
                                                {groupedByLevel.ince.map(c => (
                                                    <button key={c.id} onClick={() => handleCatSelect(c.id)} className="w-full p-4 text-left bg-gray-800/50 hover:bg-blue-600/20 hover:border-blue-500/50 border border-transparent rounded-xl transition-all">
                                                        {c.pathLabel}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="mt-6 pt-6 border-t border-gray-800">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ya da tekil ürün ara</p>
                                <input
                                    type="search"
                                    placeholder="Ürün adı yazın (örn. kaşar peynir)"
                                    value={productSearchQuery}
                                    onChange={(e) => setProductSearchQuery(e.target.value)}
                                    className="w-full bg-[#0f1115] border border-gray-800 rounded-xl p-3 mb-3 focus:border-blue-500 outline-none text-white placeholder:text-gray-500"
                                />
                                {productSearchLoading && <p className="text-gray-500 text-sm mb-2">Aranıyor...</p>}
                                {productSearchQuery.trim().length >= 2 && !productSearchLoading && productSearchResults.length > 0 && (
                                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                        {productSearchResults.map((p) => {
                                            const catId = p.masterCategory?.id ?? p.categoryId;
                                            return catId ? (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => handleCatSelect(catId)}
                                                    className="w-full text-left p-3 rounded-xl bg-gray-800/50 hover:bg-blue-600/20 border border-transparent hover:border-blue-500/50 transition-all flex items-center gap-3"
                                                >
                                                    <ProductImage src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-medium text-white truncate">{p.name}</p>
                                                        <p className="text-xs text-gray-500 truncate">{p.masterCategory?.name ?? 'Kategori'}</p>
                                                    </div>
                                                </button>
                                            ) : null;
                                        })}
                                    </div>
                                )}
                                {productSearchQuery.trim().length >= 2 && !productSearchLoading && productSearchResults.length === 0 && (
                                    <p className="text-gray-500 text-sm">Ürün bulunamadı.</p>
                                )}
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
                                <button onClick={() => setStep(3)} className="px-8 py-2 bg-blue-600 rounded-xl font-bold shadow-lg hover:bg-blue-500 transition-all">İlerle</button>
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

                            <div className="mt-8 space-y-8">
                                {/* SEEN LIST - anasayfa formatı */}
                                <div>
                                    <h3 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                                        TAKİP EDİLENLER (SEEN)
                                    </h3>
                                    {filteredProducts.filter(p => !excludedIds.includes(p.id)).length === 0 ? (
                                        <div className="p-8 border-2 border-dashed border-gray-800 rounded-2xl text-center text-gray-600 text-sm">
                                            Henüz seçili ürün yok. Aşağıdaki listeden ekle.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
                                            {filteredProducts.filter(p => !excludedIds.includes(p.id)).map((product) => (
                                                <AlarmProductCard
                                                    key={product.id}
                                                    product={product}
                                                    variant="seen"
                                                    onToggle={() => {
                                                        setExcludedIds(prev => [...prev, product.id]);
                                                        setIncludedIds(prev => prev.filter(id => id !== product.id));
                                                    }}
                                                    icon={<EyeOff className="h-4 w-4" />}
                                                    iconTitle="Gizle"
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* UNSEEN LIST - aynı format, hafif silik */}
                                <div className="pt-6 border-t border-gray-800/50">
                                    <h3 className="text-sm font-bold text-gray-500 mb-3 flex items-center gap-2">
                                        GİZLENENLER (UNSEEN)
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar opacity-85">
                                        {filteredProducts.filter(p => excludedIds.includes(p.id)).map((product) => (
                                            <AlarmProductCard
                                                key={product.id}
                                                product={product}
                                                variant="unseen"
                                                onToggle={() => {
                                                    setExcludedIds(prev => prev.filter(id => id !== product.id));
                                                    setIncludedIds(prev => [...prev, product.id]);
                                                }}
                                                icon={<Eye className="h-4 w-4" />}
                                                iconTitle="Geri al"
                                            />
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

                            {submitError && (
                                <p className="text-red-400 text-sm mb-2">{submitError}</p>
                            )}
                            <div className="flex justify-between pt-6">
                                <button onClick={() => setStep(3)} className="px-6 py-2 text-gray-400 hover:text-white transition-colors" disabled={submitting}>Geri</button>
                                <button onClick={handleSubmit} disabled={submitting} className="px-10 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-bold shadow-xl hover:scale-105 transition-all disabled:opacity-60 disabled:pointer-events-none">
                                    {submitting ? 'Kaydediliyor...' : 'Alarmı Kur'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function NewAlarmPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Yükleniyor...</div>}>
            <NewAlarmPageContent />
        </Suspense>
    );
}
