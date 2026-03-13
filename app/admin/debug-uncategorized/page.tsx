'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

interface DebugProduct {
    id: string;
    name: string;
    marketKey: string | null;
    quantityAmount: number | null;
    quantityUnit: string | null;
    createdAt: string;
    updatedAt: string;
    prices: {
        date: string;
        marketName: string;
        amount: number;
    }[];
}

interface TreeNode {
    id: string;
    name: string;
    children?: TreeNode[];
}

interface CategoryOption {
    id: string;
    pathLabel: string;
}

export default function DebugUncategorizedPage() {
    const [items, setItems] = useState<DebugProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [categoryTree, setCategoryTree] = useState<TreeNode[]>([]);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<Record<string, string>>({});

    const categoryOptions = useMemo(() => {
        const out: CategoryOption[] = [];
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

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const [debugRes, treeRes] = await Promise.all([
                fetch('/api/admin/debug-uncategorized', { credentials: 'include' }),
                fetch('/api/categories/tree'),
            ]);
            if (debugRes.status === 401) {
                window.location.href = '/admin';
                return;
            }
            const debugData = await debugRes.json().catch(() => ({}));
            const treeData = await treeRes.json().catch(() => []);
            if (!debugRes.ok) {
                setError(debugData?.error || `Sunucu hatası (${debugRes.status})`);
                setItems([]);
            } else {
                setItems(Array.isArray(debugData.products) ? debugData.products : []);
            }
            if (treeRes.ok && Array.isArray(treeData)) {
                setCategoryTree(treeData);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-6 max-w-5xl mx-auto">
            <nav className="flex items-center gap-4 mb-6 border-b border-gray-700 pb-4">
                <Link href="/admin" className="text-blue-400 hover:underline">← Admin (Kategori eşlemesi)</Link>
                <span className="text-gray-500">|</span>
                <span className="font-medium text-gray-200">Debug: Kategorisiz ürünler</span>
            </nav>
            <h1 className="text-xl font-semibold mb-2">Debug: Son 28 saatte fiyatı olan kategorisiz ürünler</h1>
            <p className="text-gray-400 text-sm mb-4">
                Burada yalnızca <strong>categoryId=null</strong> olup son 28 saatte en az bir fiyatı gelen ürünler listelenir.
                Normal kullanıcıya gösterilmez; kategori ağacında kaybolan / mapping&apos;e girmeyen ürünleri yakalamak içindir.
            </p>
            <div className="mb-4 flex gap-3 items-center">
                <button
                    type="button"
                    disabled={loading}
                    onClick={() => load()}
                    className="inline-flex items-center rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 disabled:opacity-50"
                >
                    {loading ? 'Yükleniyor…' : 'Listeyi yenile'}
                </button>
                <span className="text-xs text-gray-500">
                    Toplam: {items.length} ürün (ilk 500 sonuç).
                </span>
            </div>
            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-900/30 text-red-200 text-sm">
                    {error}
                </div>
            )}
            {loading ? (
                <p className="text-gray-500">Yükleniyor...</p>
            ) : items.length === 0 ? (
                <p className="text-gray-500">Son 28 saatte fiyatı olan kategorisiz ürün yok.</p>
            ) : (
                <div className="space-y-3">
                    {items.map((p) => (
                        <div
                            key={p.id}
                            className="rounded-xl border border-gray-700 bg-gray-900/50 p-4 text-sm flex flex-col gap-1"
                        >
                            <div className="flex flex-wrap justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="font-medium text-gray-100 truncate" title={p.name}>{p.name}</div>
                                    <div className="text-xs text-gray-500 break-all">
                                        ID: {p.id}
                                        {p.marketKey && (
                                            <>
                                                {' · '}
                                                <span className="underline decoration-dotted">marketKey:</span>{' '}
                                                <span className="break-all">{p.marketKey}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500 text-right">
                                    {p.quantityAmount && p.quantityUnit ? (
                                        <span>{p.quantityAmount} {p.quantityUnit}</span>
                                    ) : (
                                        <span>Miktar bilinmiyor</span>
                                    )}
                                    <br />
                                    <span>
                                        Oluşturulma: {new Date(p.createdAt).toLocaleDateString('tr-TR')} ·
                                        Güncellendi: {new Date(p.updatedAt).toLocaleDateString('tr-TR')}
                                    </span>
                                </div>
                            </div>
                            {p.prices.length > 0 && (
                                <div className="mt-2 text-xs text-gray-400">
                                    Son fiyatlar:{' '}
                                    {p.prices.map((pr, idx) => (
                                        <span key={idx}>
                                            {idx > 0 && ', '}
                                            {pr.marketName} · {pr.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                            {' '}({new Date(pr.date).toLocaleDateString('tr-TR')})
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <select
                                    value={selectedCategory[p.id] ?? ''}
                                    onChange={(e) =>
                                        setSelectedCategory((prev) => ({ ...prev, [p.id]: e.target.value }))
                                    }
                                    className="rounded-lg border border-gray-600 bg-gray-800 text-gray-100 px-3 py-1.5 text-xs min-w-[200px]"
                                >
                                    <option value="">Kategori ata…</option>
                                    {categoryOptions.map((opt) => (
                                        <option key={opt.id} value={opt.id}>
                                            {opt.pathLabel}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    disabled={!selectedCategory[p.id] || savingId === p.id}
                                    onClick={async () => {
                                        const categoryId = selectedCategory[p.id];
                                        if (!categoryId) return;
                                        setSavingId(p.id);
                                        setError(null);
                                        try {
                                            const res = await fetch('/api/admin/product-category', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                credentials: 'include',
                                                body: JSON.stringify({ productId: p.id, categoryId }),
                                            });
                                            const data = await res.json().catch(() => ({}));
                                            if (!res.ok) {
                                                setError(data?.error || 'Kategori atanamadı');
                                                return;
                                            }
                                            setItems((prev) => prev.filter((x) => x.id !== p.id));
                                        } finally {
                                            setSavingId(null);
                                        }
                                    }}
                                    className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-1.5 text-xs font-medium text-white"
                                >
                                    {savingId === p.id ? 'Kaydediliyor...' : 'Kategori ata'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

