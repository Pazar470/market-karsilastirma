'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, ChevronRight, ChevronDown, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sortCategoriesByOrder } from '@/lib/category-order';
import { AlarmEditProductCard, type AlarmEditProduct } from '@/components/alarm-edit-product-card';
import { FollowButton } from '@/components/follow-button';
import { AddToBasketButton } from '@/components/add-to-basket-button';

interface TreeNode {
    id: string;
    name: string;
    children?: TreeNode[];
}

function NewAlarmContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [listConfirmed, setListConfirmed] = useState(false);

    // Bilgi kutusu (akıllı alarm rehberi) için durum
    const [showInfo, setShowInfo] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const dismissed = window.localStorage.getItem('smartAlarmInfoDismissed') === '1';
        if (!dismissed) setShowInfo(true);
    }, []);

    const handleDismissInfo = () => {
        setShowInfo(false);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('smartAlarmInfoDismissed', '1');
        }
    };

    const toggleInfo = () => {
        setShowInfo((prev) => {
            const next = !prev;
            if (!next && typeof window !== 'undefined') {
                window.localStorage.setItem('smartAlarmInfoDismissed', '1');
            }
            return next;
        });
    };

    const [categoryTree, setCategoryTree] = useState<TreeNode[]>([]);
    const [categorySearch, setCategorySearch] = useState('');
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
    const [categoryIdToName, setCategoryIdToName] = useState<Record<string, string>>({});
    const [isCategoryPanelOpen, setIsCategoryPanelOpen] = useState(false);

    const [selectedProducts, setSelectedProducts] = useState<AlarmEditProduct[]>([]);
    const [productSearchQ, setProductSearchQ] = useState('');
    const [productSearchResults, setProductSearchResults] = useState<AlarmEditProduct[]>([]);
    const [productSearchLoading, setProductSearchLoading] = useState(false);

    const [finalProducts, setFinalProducts] = useState<AlarmEditProduct[]>([]);
    const [finalProductsLoading, setFinalProductsLoading] = useState(false);
    const [excludedIds, setExcludedIds] = useState<string[]>([]);

    const [name, setName] = useState('');
    const [targetPrice, setTargetPrice] = useState('');
    const [unitType, setUnitType] = useState('KG');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/categories/tree')
            .then((res) => res.json())
            .then((data) => {
                const tree = Array.isArray(data) ? data : [];
                const sorted = sortCategoriesByOrder(tree);
                setCategoryTree(sorted);
                if (sorted.length > 0) setExpanded(new Set([sorted[0].id]));
            })
            .catch(() => setCategoryTree([]));
    }, []);

    const productIdFromQuery = searchParams.get('productId');
    useEffect(() => {
        if (!productIdFromQuery?.trim()) return;
        fetch(`/api/products?productIds=${encodeURIComponent(productIdFromQuery.trim())}`)
            .then((res) => res.json())
            .then((data) => {
                const list = Array.isArray(data) ? data : (data?.products ?? []);
                const product = list[0];
                if (product && product.id) {
                    setSelectedProducts((prev) => (prev.some((p) => p.id === product.id) ? prev : [...prev, product]));
                }
            })
            .catch(() => {});
    }, [productIdFromQuery]);

    const filteredTree = useMemo(() => {
        const q = categorySearch.trim().toLowerCase();
        if (!q) return categoryTree;
        function filterNode(node: TreeNode): TreeNode | null {
            const match = (node.name || '').toLowerCase().includes(q);
            const children = (node.children || []).map(filterNode).filter((n): n is TreeNode => n !== null);
            if (match || children.length > 0) return { ...node, children: children.length ? children : node.children };
            return null;
        }
        return categoryTree.map(filterNode).filter((n): n is TreeNode => n !== null);
    }, [categoryTree, categorySearch]);

    const addCategory = (catId: string, catName: string) => {
        if (selectedCategoryIds.includes(catId)) return;
        setSelectedCategoryIds((prev) => [...prev, catId]);
        setCategoryIdToName((m) => ({ ...m, [catId]: catName }));
        // Yaprak kategori seçilince paneli kapat, kullanıcı isterse tekrar açıp yeni kategori ekleyebilir.
        setIsCategoryPanelOpen(false);
    };

    const removeCategory = (catId: string) => {
        setSelectedCategoryIds((prev) => prev.filter((id) => id !== catId));
    };

    const searchProducts = () => {
        const q = productSearchQ.trim();
        if (!q) return;
        setProductSearchLoading(true);
        fetch(`/api/products?q=${encodeURIComponent(q)}`)
            .then((res) => res.json())
            .then((data) => {
                const list = Array.isArray(data) ? data : (data?.products ?? []);
                setProductSearchResults(list);
            })
            .finally(() => setProductSearchLoading(false));
    };

    const clearProductSearch = () => {
        setProductSearchQ('');
        setProductSearchResults([]);
    };

    const addProductToSelection = (product: AlarmEditProduct) => {
        if (selectedProducts.some((p) => p.id === product.id)) return;
        setSelectedProducts((prev) => [...prev, product]);
    };

    const removeProductFromSelection = (productId: string) => {
        setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
    };

    const canConfirmList = selectedCategoryIds.length > 0 || selectedProducts.length > 0;

    const confirmList = () => {
        if (!canConfirmList) return;
        setListConfirmed(true);
        setFinalProductsLoading(true);
        const productIds = selectedProducts.map((p) => p.id);
        const promises: Promise<AlarmEditProduct[]>[] = [];
        if (selectedCategoryIds.length > 0) {
            const qs = selectedCategoryIds.map((id) => `categoryId=${encodeURIComponent(id)}`).join('&');
            promises.push(
                fetch(`/api/products?${qs}`).then((r) => r.json()).then((d) => Array.isArray(d) ? d : (d?.products ?? []))
            );
        }
        Promise.all(promises)
            .then((results) => {
                const fromCategories = results.flat();
                const byId = new Map<string, AlarmEditProduct>();
                selectedProducts.forEach((p) => byId.set(p.id, p));
                fromCategories.forEach((p) => byId.set(p.id, p));
                setFinalProducts(Array.from(byId.values()));
                setExcludedIds([]);
            })
            .finally(() => setFinalProductsLoading(false));
    };

    const handleSubmit = async () => {
        setSubmitError(null);
        if (!name?.trim()) {
            setSubmitError('Alarm ismi girin.');
            return;
        }
        const price = parseFloat(String(targetPrice).replace(',', '.'));
        if (Number.isNaN(price) || price < 0) {
            setSubmitError('Geçerli bir hedef birim fiyat girin.');
            return;
        }
        const includedProductIds = finalProducts.filter((p) => !excludedIds.includes(p.id)).map((p) => p.id);
        if (includedProductIds.length === 0) {
            setSubmitError('En az bir ürün listede kalmalı (hepsini gizlemiş olmayın).');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch('/api/alarms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    categoryIds: selectedCategoryIds,
                    targetPrice: price,
                    unitType,
                    tags: [],
                    includedProductIds,
                    excludedProductIds: excludedIds,
                    isAllProducts: true,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setSubmitError((data as { error?: string }).error || `Hata (${res.status}). Tekrar deneyin.`);
                return;
            }
            const id = (data as { id?: string }).id;
            if (id) router.push(`/alarms/${id}/edit`);
            else router.push('/alarms');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleExpand = (id: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const renderNode = (node: TreeNode, depth: number) => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expanded.has(node.id);
        const name = node.name || 'Diğer';
        const isLeaf = !hasChildren;
        return (
            <div key={node.id} style={{ paddingLeft: depth * 12 }} className="py-0.5">
                <div className="flex items-center gap-0.5 min-w-0">
                    {hasChildren ? (
                        <button
                            type="button"
                            onClick={() => toggleExpand(node.id)}
                            className="p-0.5 shrink-0 rounded hover:bg-gray-100"
                        >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                    ) : (
                        <span className="w-5 shrink-0 inline-block" />
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            if (isLeaf) addCategory(node.id, name);
                            else toggleExpand(node.id);
                        }}
                        className={cn(
                            'flex-1 text-left text-sm py-1.5 px-2 rounded-lg truncate',
                            selectedCategoryIds.includes(node.id) ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                        )}
                    >
                        {name}
                    </button>
                </div>
                {hasChildren && isExpanded &&
                    (node.children || []).map((child) => renderNode(child, depth + 1))}
            </div>
        );
    };

    const gridClass = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3';

    // ——— Aşama 2: Listeyi onayladıktan sonra ———
    if (listConfirmed) {
        const visibleProducts = finalProducts.filter((p) => !excludedIds.includes(p.id));
        return (
            <div className="min-h-screen bg-gray-50 text-gray-900">
                <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2 flex-wrap">
                            <label className="text-sm font-medium text-gray-700">Alarm ismi</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Örn. Kaşar Alarmı"
                                className="h-9 px-3 rounded-lg border border-gray-200 text-sm w-48"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <label className="text-sm font-medium text-gray-700">Hedef birim fiyat (₺)</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={targetPrice}
                                onChange={(e) => setTargetPrice(e.target.value)}
                                className="w-24 h-9 px-2 rounded-lg border border-gray-200 text-sm font-medium"
                            />
                            <span className="text-sm text-gray-500">/ {unitType}</span>
                            <Button
                                onClick={handleSubmit}
                                disabled={submitting || finalProductsLoading}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {submitting ? 'Kaydediliyor...' : 'Alarmı kaydet'}
                            </Button>
                        </div>
                    </div>
                    {submitError && <p className="text-red-600 text-sm mb-2">{submitError}</p>}

                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800">
                            <strong>Listedeki ürünlerden istediğinizi gizleyerek liste dışı bırakabilirsiniz.</strong> Gizlediğiniz ürünler bu alarma dahil edilmez; isterseniz sonradan düzenleme sayfasından tekrar ekleyebilirsiniz.
                        </p>
                    </div>

                    {finalProductsLoading ? (
                        <div className="py-16 flex justify-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-blue-600" />
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-gray-600 mb-2">
                                {visibleProducts.length} ürün alarmda — {excludedIds.length} gizli
                            </p>
                            <div className={gridClass}>
                                {visibleProducts.map((product) => {
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
                                                    <FollowButton
                                                        productId={product.id}
                                                        categoryId={selectedCategoryIds[0] || (product as { masterCategoryId?: string }).masterCategoryId || ''}
                                                        className="h-7 w-7 shrink-0"
                                                    />
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
                            {excludedIds.length > 0 && (
                                <details className="mt-4">
                                    <summary className="text-sm font-medium text-gray-600 cursor-pointer">
                                        Gizlenen ürünler ({excludedIds.length}) — Göster
                                    </summary>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {finalProducts
                                            .filter((p) => excludedIds.includes(p.id))
                                            .map((p) => (
                                                <span key={p.id} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs">
                                                    {p.name}
                                                    <button
                                                        type="button"
                                                        onClick={() => setExcludedIds((prev) => prev.filter((id) => id !== p.id))}
                                                        className="text-blue-600 hover:underline"
                                                    >
                                                        Göster
                                                    </button>
                                                </span>
                                            ))}
                                    </div>
                                </details>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    }

    // ——— Aşama 1: Liste oluşturma ———
    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4">
                {/* Üst başlık + Nasıl çalışır? */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                    <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Akıllı fiyat alarmı oluştur</h1>
                    <button
                        type="button"
                        onClick={toggleInfo}
                        className="self-start inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                    >
                        Nasıl çalışır?
                    </button>
                </div>
                {showInfo && (
                    <div className="mb-4 relative rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs sm:text-sm text-blue-900">
                        <button
                            type="button"
                            onClick={handleDismissInfo}
                            className="absolute right-2 top-2 p-1.5 rounded hover:bg-red-50 text-red-600 border border-red-200"
                            aria-label="Bilgi kutusunu kapat"
                        >
                            <X className="h-4 w-4 stroke-[2.5]" />
                        </button>
                        <ul className="list-disc pl-4 space-y-1">
                            <li><strong>Tek ürün değil, kategoriye alarm:</strong> Aynı türdeki tüm ürünleri tek alarmda takip edersin.</li>
                            <li><strong>Örnek:</strong> “Kaşar Peyniri” kategorisine 300 ₺/kg hedef koy → tüm marketlerdeki kaşarlar bu sınırın altına düştüğünde haberin olur.</li>
                            <li>Böylece marka marka uğraşmak yerine, <strong>ürün tipine göre en iyi fırsatı</strong> yakalarsın.</li>
                            <li><strong>Birden fazla kategori</strong> seçebilirsin; aynı alarm farklı ürün türleri için geçerli olur.</li>
                            <li><strong>Kategori + tekil ürün:</strong> Hem kategori(ler) hem de tek tek ürünler ekleyebilirsin — hepsi tek alarmda takip edilir.</li>
                            <li><strong>Örnek:</strong> Ali’nin 200 ₺’si var; şekerpare, kap dondurma ve donuk lahmacun almak istiyor ama hepsi 200 ₺’den pahalı. Ali Fiyat Radar’da bu üç ürün için “200 ₺ altına düşünce haber ver” alarmını kuruyor. Fiyat bu seviyeye indiğinde bildirim alma olasılığı: <strong>%100</strong>.</li>
                        </ul>
                    </div>
                )}

                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Sol: Kategori seç + Seçilen kategoriler */}
                    <aside className="w-full lg:w-72 shrink-0 space-y-4">
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <h2 className="font-semibold text-gray-900 mb-2">Kategori ile alan seç</h2>
                            <p className="text-xs text-gray-500 mb-3">
                                Kategori seçersen alarm bu türdeki <strong>tüm ürünler</strong> için geçerli olur.
                            </p>
                            <button
                                type="button"
                                onClick={() => setIsCategoryPanelOpen((prev) => !prev)}
                                className="w-full mb-2 rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 text-sm py-1.5 px-3 text-gray-800 text-left"
                            >
                                {isCategoryPanelOpen ? 'Kategori seçim panelini gizle' : 'Kategori seç'}
                            </button>
                            {isCategoryPanelOpen && (
                                <div className="mt-2">
                                    <div className="relative mb-2">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            type="search"
                                            placeholder="Kategori ara..."
                                            value={categorySearch}
                                            onChange={(e) => setCategorySearch(e.target.value)}
                                            className="pl-8 h-9 text-sm"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">
                                        Yaprak kategoriye tıklayınca sadece kategori adı listeye eklenir; ürünler şimdilik yüklenmez.
                                    </p>
                                    <div className="max-h-[40vh] overflow-y-auto pr-1 space-y-0.5">
                                        {filteredTree.map((node) => renderNode(node, 0))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Seçilen kategoriler</h3>
                            {selectedCategoryIds.length === 0 ? (
                                <p className="text-xs text-gray-400">Henüz kategori seçmediniz.</p>
                            ) : (
                                <ul className="space-y-1.5">
                                    {selectedCategoryIds.map((catId) => (
                                        <li key={catId} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg bg-gray-50">
                                            <span className="text-sm truncate">{categoryIdToName[catId] || catId}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeCategory(catId)}
                                                className="shrink-0 p-1 rounded hover:bg-red-100 text-gray-500 hover:text-red-600"
                                                aria-label="Kategoriden çıkar"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </aside>

                    {/* Sağ: Tekil ürün ara + Seçilen ürünler + Listeyi onayla */}
                    <main className="flex-1 min-w-0">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        <div className="relative flex-1 min-w-[200px]">
                            <Input
                                type="search"
                                placeholder="Ürün ara (isme göre)..."
                                value={productSearchQ}
                                onChange={(e) => setProductSearchQ(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchProducts())}
                                className="pr-8 h-10 text-sm"
                            />
                            {(productSearchQ.length > 0 || productSearchResults.length > 0) && (
                                <button
                                    type="button"
                                    onClick={clearProductSearch}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-200 text-gray-500"
                                    aria-label="Aramayı temizle"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={searchProducts}
                            disabled={productSearchLoading || !productSearchQ.trim()}
                            className="h-10"
                        >
                            {productSearchLoading ? 'Aranıyor...' : 'Ara'}
                        </Button>
                        {productSearchResults.length > 0 && (
                            <span className="text-xs text-gray-500">{productSearchResults.length} sonuç</span>
                        )}
                    </div>

                    {productSearchResults.length > 0 && (
                        <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                            <p className="text-xs font-medium text-gray-600 mb-2">Arama sonuçları — Alarma ekle:</p>
                            <div className={gridClass}>
                                {productSearchResults.slice(0, 12).map((product) => (
                                    <AlarmEditProductCard
                                        key={product.id}
                                        product={product}
                                        actions={
                                            selectedProducts.some((p) => p.id === product.id) ? (
                                                <span className="h-7 px-2 rounded-md bg-green-100 text-green-800 text-[10px] font-bold inline-flex items-center">
                                                    Eklendi
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => addProductToSelection(product)}
                                                    className="h-7 min-w-[60px] px-2 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold hover:bg-blue-200"
                                                >
                                                    Alarma ekle
                                                </button>
                                            )
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedProducts.length > 0 && (
                        <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Seçilen tekil ürünler</h3>
                            <div className={gridClass}>
                                {selectedProducts.map((product) => (
                                    <AlarmEditProductCard
                                        key={product.id}
                                        product={product}
                                        actions={
                                            <button
                                                type="button"
                                                onClick={() => removeProductFromSelection(product.id)}
                                                className="h-7 min-w-[52px] px-2 rounded-md bg-gray-100 text-gray-700 text-[10px] font-bold hover:bg-gray-200"
                                            >
                                                Çıkar
                                            </button>
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {!canConfirmList && (
                        <div className="py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
                            Kategori ekleyin ve/veya yukarıdan ürün arayıp tekil ürün ekleyin. Ardından &quot;Listeyi onayla&quot; ile devam edin.
                        </div>
                    )}

                    <div className="mt-6">
                        <Button
                            onClick={confirmList}
                            disabled={!canConfirmList}
                            className="w-full sm:w-auto h-10 px-6 bg-green-600 hover:bg-green-700 text-white font-medium"
                        >
                            Listeyi onayla
                        </Button>
                        {canConfirmList && (
                            <p className="text-xs text-gray-500 mt-2">
                                {selectedCategoryIds.length} kategori, {selectedProducts.length} tekil ürün seçildi. Onaylayınca tüm ürünler tek listede açılacak; gizle / fiyat / kayıt orada yapılacak.
                            </p>
                        )}
                    </div>
                    </main>
                </div>
            </div>
        </div>
    );
}

export default function NewAlarmPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-blue-600" />
            </div>
        }>
            <NewAlarmContent />
        </Suspense>
    );
}
