'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronRight, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlarmEditProductCard, type AlarmEditProduct } from '@/components/alarm-edit-product-card';
import { FollowButton } from '@/components/follow-button';
import { AddToBasketButton } from '@/components/add-to-basket-button';

interface TreeNode {
    id: string;
    name: string;
    children?: TreeNode[];
}

export default function NewAlarmPage() {
    const router = useRouter();
    const [categoryTree, setCategoryTree] = useState<TreeNode[]>([]);
    const [categorySearch, setCategorySearch] = useState('');
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [selectedCat, setSelectedCat] = useState<string | null>(null);
    const [selectedCatName, setSelectedCatName] = useState('');
    const [products, setProducts] = useState<AlarmEditProduct[]>([]);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [targetPrice, setTargetPrice] = useState('');
    const [unitType, setUnitType] = useState('KG');
    const [excludedIds, setExcludedIds] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/categories/tree')
            .then((res) => res.json())
            .then((data) => {
                const tree = Array.isArray(data) ? data : [];
                setCategoryTree(tree);
                if (tree.length > 0) setExpanded(new Set([tree[0].id]));
            })
            .catch(() => setCategoryTree([]));
    }, []);

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

    const handleSelectCategory = async (catId: string, catName: string) => {
        setSelectedCat(catId);
        setSelectedCatName(catName);
        setName(`${catName} Alarmı`);
        setLoading(true);
        setExcludedIds([]);
        try {
            const res = await fetch(`/api/products?categoryId=${catId}`);
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data?.products ?? []);
            setProducts(list);
        } finally {
            setLoading(false);
        }
    };

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
                    tags: [],
                    includedProductIds: products.filter((p) => !excludedIds.includes(p.id)).map((p) => p.id),
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
                        onClick={() => handleSelectCategory(node.id, name)}
                        className={cn(
                            'flex-1 text-left text-sm py-1.5 px-2 rounded-lg truncate',
                            selectedCat === node.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
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
    const visibleProducts = products.filter((p) => !excludedIds.includes(p.id));

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 flex flex-col md:flex-row gap-4">
                {/* Sol: Kategoriler (ana sayfa stili) */}
                <aside className="w-full md:w-64 shrink-0">
                    <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-20">
                        <h2 className="font-semibold text-gray-900 mb-3">Kategoriler</h2>
                        <div className="relative mb-3">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                type="search"
                                placeholder="Kategori ara..."
                                value={categorySearch}
                                onChange={(e) => setCategorySearch(e.target.value)}
                                className="pl-8 h-9 text-sm"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mb-3">
                            Ürünler ve fiyatlar marketlerin online sitelerinden günlük taramalarla alınır.
                        </p>
                        <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-0.5">
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedCat(null);
                                    setProducts([]);
                                    setSelectedCatName('');
                                }}
                                className={cn(
                                    'w-full text-left text-sm py-2 px-2 rounded-lg',
                                    !selectedCat ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                                )}
                            >
                                Tüm Ürünler
                            </button>
                            {filteredTree.map((node) => renderNode(node, 0))}
                        </div>
                    </div>
                </aside>

                {/* Sağ: Ürünler + hedef fiyat + Alarmı kaydet */}
                <main className="flex-1 min-w-0">
                    {/* Sağ üst: hedef fiyat + Alarmı kaydet */}
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
                                disabled={submitting || !selectedCat}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {submitting ? 'Kaydediliyor...' : 'Alarmı kaydet'}
                            </Button>
                        </div>
                    </div>
                    {submitError && <p className="text-red-600 text-sm mb-2">{submitError}</p>}

                    {!selectedCat ? (
                        <div className="py-16 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
                            Soldan bir kategori seçin; ürünler burada listelenecek.
                        </div>
                    ) : loading ? (
                        <div className="py-16 flex justify-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-blue-600" />
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-gray-600 mb-2">
                                {selectedCatName} — {visibleProducts.length} ürün (gizlenenler alarm dışı)
                            </p>
                            <div className={gridClass}>
                                {visibleProducts.map((product) => (
                                    <AlarmEditProductCard
                                        key={product.id}
                                        product={product}
                                        actions={
                                            <>
                                                <FollowButton
                                                    productId={product.id}
                                                    categoryId={selectedCat}
                                                    className="h-7 w-7 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-600 shrink-0"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setExcludedIds((prev) => [...prev, product.id])}
                                                    className="h-7 min-w-[52px] px-2 rounded-md bg-gray-100 text-gray-700 text-[10px] font-bold hover:bg-gray-200"
                                                >
                                                    Gizle
                                                </button>
                                                {product.prices?.[0] && (
                                                    <AddToBasketButton
                                                        product={{
                                                            id: product.id,
                                                            name: product.name,
                                                            imageUrl: product.imageUrl || '',
                                                            price:
                                                                product.prices[0].campaignAmount != null
                                                                    ? parseFloat(product.prices[0].campaignAmount)
                                                                    : parseFloat(product.prices[0].amount),
                                                            marketName: product.prices[0].market?.name || 'Market',
                                                        }}
                                                        variant="icon"
                                                    />
                                                )}
                                            </>
                                        }
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
