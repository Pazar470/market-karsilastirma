'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface Market {
    id: string;
    name: string;
}

interface CategoryCode {
    marketCategoryCode: string;
    marketCategoryPath?: string;
}

interface ProductRow {
    id: string;
    name: string;
    categoryId: string | null;
    category: string | null;
    masterCategoryPath: string;
    marketCategoryCode: string | null;
    marketCategoryPath: string | null;
    marketName?: string | null;
}

interface TreeNode {
    id: string;
    name: string;
    children?: TreeNode[];
}

const cred = { credentials: 'include' as RequestCredentials };

export default function KategoriDuzeltPage() {
    const [authFailed, setAuthFailed] = useState(false);
    const [markets, setMarkets] = useState<Market[]>([]);
    const [categoryCodes, setCategoryCodes] = useState<CategoryCode[]>([]);
    const [categoryTree, setCategoryTree] = useState<TreeNode[]>([]);
    const [selectedMarket, setSelectedMarket] = useState('');
    const [selectedCode, setSelectedCode] = useState('');
    const [selectedMasterCategoryId, setSelectedMasterCategoryId] = useState('');
    const [search, setSearch] = useState('');
    const [products, setProducts] = useState<ProductRow[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loadingCodes, setLoadingCodes] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [newCategoryId, setNewCategoryId] = useState<Record<string, string>>({});

    const limit = 30;

    const categoryOptions = useMemo(() => {
        const out: { id: string; pathLabel: string }[] = [];
        function walk(nodes: TreeNode[], path: string[]) {
            for (const n of nodes) {
                const name = (n.name || '').trim() || 'Diğer';
                const pathLabel = path.length ? `${path.join(' > ')} > ${name}` : name;
                out.push({ id: n.id, pathLabel });
                if (n.children?.length) walk(n.children, [...path, name]);
            }
        }
        walk(categoryTree, []);
        return out.sort((a, b) => a.pathLabel.localeCompare(b.pathLabel));
    }, [categoryTree]);

    useEffect(() => {
        (async () => {
            const [marketsRes, treeRes] = await Promise.all([
                fetch('/api/admin/kategori-duzelt?what=markets', cred),
                fetch('/api/categories/tree', cred),
            ]);
            if (marketsRes.status === 401) {
                setAuthFailed(true);
                return;
            }
            const marketsData = await marketsRes.json().catch(() => ({}));
            const tree = await treeRes.json().catch(() => []);
            setMarkets(Array.isArray(marketsData.markets) ? marketsData.markets : []);
            setCategoryTree(Array.isArray(tree) ? tree : []);
        })();
    }, []);

    useEffect(() => {
        if (!selectedMarket.trim()) {
            setCategoryCodes([]);
            setSelectedCode('');
            return;
        }
        setLoadingCodes(true);
        fetch(
            `/api/admin/kategori-duzelt?what=categoryCodes&marketName=${encodeURIComponent(selectedMarket)}`,
            cred
        )
            .then((r) => r.json())
            .then((d) => {
                setCategoryCodes(Array.isArray(d.categoryCodes) ? d.categoryCodes : []);
                setSelectedCode('');
            })
            .finally(() => setLoadingCodes(false));
    }, [selectedMarket]);

    const loadProducts = (pageOverride?: number) => {
        const canList = selectedMarket.trim() || selectedMasterCategoryId || search.trim();
        if (!canList) return;
        setLoadingProducts(true);
        const p = pageOverride ?? page;
        const params = new URLSearchParams({
            what: 'products',
            page: String(p),
            limit: String(limit),
        });
        if (selectedMarket.trim()) params.set('marketName', selectedMarket.trim());
        if (selectedCode) params.set('marketCategoryCode', selectedCode);
        if (selectedMasterCategoryId) params.set('masterCategoryId', selectedMasterCategoryId);
        if (search.trim()) params.set('search', search.trim());
        fetch(`/api/admin/kategori-duzelt?${params}`, cred)
            .then((r) => r.json())
            .then((d) => {
                setProducts(Array.isArray(d.products) ? d.products : []);
                setTotal(Number(d.total) ?? 0);
            })
            .finally(() => setLoadingProducts(false));
    };

    const handleSave = async (productId: string) => {
        const categoryId = newCategoryId[productId];
        if (!categoryId) return;
        setSavingId(productId);
        try {
            const res = await fetch('/api/admin/product-category', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ productId, categoryId }),
            });
            if (res.ok) {
                setNewCategoryId((prev) => {
                    const next = { ...prev };
                    delete next[productId];
                    return next;
                });
                loadProducts();
            }
        } finally {
            setSavingId(null);
        }
    };

    if (authFailed) {
        return (
            <div className="min-h-screen bg-gray-950 text-gray-100 p-6 max-w-2xl mx-auto">
                <p className="text-amber-200 mb-4">Bu sayfa için admin girişi gerekli.</p>
                <Link href="/admin" className="text-blue-400 hover:underline">← Admin girişine dön</Link>
            </div>
        );
    }

    const totalPages = Math.ceil(total / limit) || 1;

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-6 max-w-5xl mx-auto">
            <nav className="flex items-center gap-4 mb-6 border-b border-gray-700 pb-4">
                <Link href="/admin" className="text-blue-400 hover:underline">← Kategori eşlemesi</Link>
                <span className="text-gray-500">|</span>
                <span className="font-medium text-gray-200">Kategori yolu düzelt</span>
            </nav>
            <h1 className="text-xl font-semibold mb-2">Yanlış kategori yolunu düzelt</h1>
            <p className="text-gray-400 text-sm mb-4">
                Market seçmek zorunlu değil: sadece bizim master kategori yolunu seçerek veya ürün adıyla arayarak da listeleme yapabilirsiniz. Market, market kategori kodu ve ürün ara hepsi isteğe bağlı filtre; en az birini doldurup Listele deyin. Master kategori yolunu buradan değiştirin.
            </p>

            <div className="flex flex-wrap items-end gap-3 mb-6">
                <label className="flex flex-col gap-1">
                    <span className="text-gray-400 text-sm">Market</span>
                    <select
                        value={selectedMarket}
                        onChange={(e) => setSelectedMarket(e.target.value)}
                        className="rounded-lg border border-gray-600 bg-gray-800 text-gray-100 px-3 py-2 text-sm min-w-[140px]"
                    >
                        <option value="">Tümü (filtre yok)</option>
                        {markets.map((m) => (
                            <option key={m.id} value={m.name}>{m.name}</option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-gray-400 text-sm">Market kategori kodu</span>
                    <select
                        value={selectedCode}
                        onChange={(e) => setSelectedCode(e.target.value)}
                        disabled={loadingCodes || !selectedMarket}
                        className="rounded-lg border border-gray-600 bg-gray-800 text-gray-100 px-3 py-2 text-sm min-w-[200px]"
                    >
                        <option value="">Tümü</option>
                        {categoryCodes.map((c) => (
                            <option key={c.marketCategoryCode} value={c.marketCategoryCode}>
                                {c.marketCategoryPath || c.marketCategoryCode}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-gray-400 text-sm">Master kategori (bizim yol)</span>
                    <select
                        value={selectedMasterCategoryId}
                        onChange={(e) => setSelectedMasterCategoryId(e.target.value)}
                        className="rounded-lg border border-gray-600 bg-gray-800 text-gray-100 px-3 py-2 text-sm min-w-[220px] max-w-[280px]"
                    >
                        <option value="">Tümü</option>
                        {categoryOptions.map((o) => (
                            <option key={o.id} value={o.id} title={o.pathLabel}>
                                {o.pathLabel.length > 45 ? o.pathLabel.slice(0, 44) + '…' : o.pathLabel}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-gray-400 text-sm">Ürün ara (tekil)</span>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Ürün adıyla filtrele"
                        className="rounded-lg border border-gray-600 bg-gray-800 text-gray-100 px-3 py-2 text-sm w-48"
                    />
                </label>
                <button
                    type="button"
                    onClick={() => { setPage(1); loadProducts(1); }}
                    disabled={(!selectedMarket && !selectedMasterCategoryId && !search.trim()) || loadingProducts}
                    className="rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-sm text-gray-100 hover:bg-gray-600 disabled:opacity-50"
                >
                    {loadingProducts ? 'Yükleniyor…' : 'Listele'}
                </button>
            </div>

            {products.length > 0 && (
                <>
                    <p className="text-gray-400 text-sm mb-2">
                        Toplam {total} ürün (sayfa {page} / {totalPages})
                    </p>
                    <div className="overflow-x-auto rounded-lg border border-gray-700">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-800 text-left">
                                <tr>
                                    <th className="p-2 font-medium">Ürün</th>
                                    <th className="p-2 font-medium">Market kategorisi</th>
                                    <th className="p-2 font-medium">Mevcut master yol</th>
                                    <th className="p-2 font-medium">Yeni kategori</th>
                                    <th className="p-2 w-24" />
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((p) => (
                                    <tr key={p.id} className="border-t border-gray-700">
                                        <td className="p-2 max-w-[200px] truncate" title={p.name}>{p.name}</td>
                                        <td className="p-2 text-gray-400 max-w-[180px] truncate" title={p.marketCategoryPath || p.marketCategoryCode || ''}>
                                            {p.marketName && <span className="text-gray-500">{p.marketName}: </span>}
                                            {p.marketCategoryPath || p.marketCategoryCode || '—'}
                                        </td>
                                        <td className="p-2 text-gray-300 max-w-[220px] truncate" title={p.masterCategoryPath}>{p.masterCategoryPath}</td>
                                        <td className="p-2">
                                            <select
                                                value={newCategoryId[p.id] ?? p.categoryId ?? ''}
                                                onChange={(e) => setNewCategoryId((prev) => ({ ...prev, [p.id]: e.target.value }))}
                                                className="rounded border border-gray-600 bg-gray-800 text-gray-100 px-2 py-1 text-xs max-w-[220px] w-full"
                                            >
                                                <option value="">—</option>
                                                {categoryOptions.map((o) => (
                                                    <option key={o.id} value={o.id} title={o.pathLabel}>{o.pathLabel}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-2">
                                            <button
                                                type="button"
                                                onClick={() => handleSave(p.id)}
                                                disabled={savingId === p.id || !(newCategoryId[p.id] || p.categoryId) || newCategoryId[p.id] === p.categoryId}
                                                className="text-xs rounded border border-gray-600 bg-gray-700 px-2 py-1 hover:bg-gray-600 disabled:opacity-50"
                                            >
                                                {savingId === p.id ? 'Kaydediliyor…' : 'Kaydet'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                        <button
                            type="button"
                            onClick={() => { const next = Math.max(1, page - 1); setPage(next); loadProducts(next); }}
                            disabled={page <= 1 || loadingProducts}
                            className="rounded border border-gray-600 bg-gray-800 px-3 py-1 text-sm disabled:opacity-50"
                        >
                            Önceki
                        </button>
                        <span className="text-gray-400 text-sm">{page} / {totalPages}</span>
                        <button
                            type="button"
                            onClick={() => { const next = Math.min(totalPages, page + 1); setPage(next); loadProducts(next); }}
                            disabled={page >= totalPages || loadingProducts}
                            className="rounded border border-gray-600 bg-gray-800 px-3 py-1 text-sm disabled:opacity-50"
                        >
                            Sonraki
                        </button>
                    </div>
                </>
            )}

            {!loadingProducts && products.length === 0 && total === 0 && (selectedMarket || selectedMasterCategoryId || search.trim()) && (
                <p className="text-gray-500">Ürün bulunamadı. Filtreleri değiştirip Listele ile tekrar deneyin.</p>
            )}
        </div>
    );
}
