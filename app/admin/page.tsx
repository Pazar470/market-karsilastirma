'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface PendingRow {
    marketName: string;
    marketCategoryCode: string;
    marketCategoryName?: string | null;
    productCount: number;
    isManuel?: boolean;
    isNoCode?: boolean;
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

interface PendingProduct {
    id: string;
    name: string;
    categoryId: string | null;
}

export default function AdminPage() {
    const [authenticated, setAuthenticated] = useState<boolean | null>(null);
    const [pending, setPending] = useState<PendingRow[]>([]);
    const [categoryTree, setCategoryTree] = useState<TreeNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');

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

    const loadData = async () => {
        setLoading(true);
        const [pendingRes, treeRes] = await Promise.all([
            fetch('/api/admin/pending-category-mappings', { credentials: 'include' }),
            fetch('/api/categories/tree'),
        ]);
        if (pendingRes.status === 401) {
            setAuthenticated(false);
            setLoading(false);
            return;
        }
        const pendingList = await pendingRes.json().catch(() => ({}));
        const tree = await treeRes.json().catch(() => []);
        if (!pendingRes.ok) {
            setError(Array.isArray(pendingList) ? null : (pendingList as { error?: string })?.error || `Sunucu hatası (${pendingRes.status})`);
            setPending([]);
        } else {
            setError(null);
            setPending(Array.isArray(pendingList) ? pendingList : []);
        }
        setCategoryTree(Array.isArray(tree) ? tree : []);
        setAuthenticated(true);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ password: loginPassword }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setLoginError(data?.error || 'Giriş başarısız');
            return;
        }
        setLoginPassword('');
        setLoading(true);
        await loadData();
    };

    const createCategory = async (parentId: string | null, name: string): Promise<string> => {
        const res = await fetch('/api/admin/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ parentId, name }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Kategori oluşturulamadı');
        await loadData();
        return data.id;
    };

    const handleSaveMapping = async (marketName: string, marketCategoryCode: string, categoryId: string) => {
        const key = `${marketName}\t${marketCategoryCode}`;
        setSaving(key);
        setError(null);
        try {
            const res = await fetch('/api/admin/category-mapping', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ marketName, marketCategoryCode, categoryId }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || 'Kayıt başarısız');
            setPending((prev) => prev.filter((r) => !(r.marketName === marketName && r.marketCategoryCode === marketCategoryCode)));
        } catch (e: any) {
            setError(e?.message || 'Kayıt başarısız');
        } finally {
            setSaving(null);
        }
    };

    const handleAddManuel = async (marketName: string, marketCategoryCode: string) => {
        const key = `${marketName}\t${marketCategoryCode}`;
        setSaving(key);
        setError(null);
        try {
            const res = await fetch('/api/admin/category-manuel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ marketName, marketCategoryCode }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || 'Eklenemedi');
            await loadData();
        } catch (e: any) {
            setError(e?.message || 'Eklenemedi');
        } finally {
            setSaving(null);
        }
    };

    const handleSaveProduct = async (productId: string, categoryId: string, onProductSaved?: () => void) => {
        setError(null);
        try {
            const res = await fetch('/api/admin/product-category', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, categoryId }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || 'Kayıt başarısız');
            onProductSaved?.();
        } catch (e: any) {
            setError(e?.message || 'Kayıt başarısız');
        }
    };

    if (authenticated === false) {
        return (
            <div className="min-h-screen bg-gray-950 text-gray-100 p-6 flex items-center justify-center">
                <div className="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-900/50 p-6">
                    <h1 className="text-lg font-semibold mb-2">Admin girişi</h1>
                    <p className="text-gray-400 text-sm mb-4">Şifreyi girerek panele eriş.</p>
                    <form onSubmit={handleLogin}>
                        <input
                            type="password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="Şifre"
                            className="w-full rounded-lg border border-gray-600 bg-gray-800 text-gray-100 px-3 py-2 mb-3 focus:ring-2 focus:ring-blue-500"
                            autoFocus
                        />
                        {loginError && <p className="text-red-400 text-sm mb-2">{loginError}</p>}
                        <button type="submit" className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 py-2 text-white font-medium">
                            Giriş
                        </button>
                    </form>
                    <Link href="/" className="block mt-4 text-center text-sm text-gray-500 hover:text-gray-300">← Anasayfa</Link>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
                <p className="text-gray-400">Yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-6 max-w-4xl mx-auto">
            <nav className="flex items-center gap-4 mb-6 border-b border-gray-700 pb-4">
                <Link href="/" className="text-blue-400 hover:underline">← Anasayfa</Link>
                <span className="text-gray-500">|</span>
                <span className="font-medium text-gray-200">Kategori eşlemesi</span>
                <span className="text-gray-500">|</span>
                <Link href="/tarama" className="text-blue-400 hover:underline">Tarama izleme</Link>
                <span className="text-gray-500">|</span>
                <button
                    type="button"
                    onClick={async () => {
                        await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
                        window.location.href = '/admin';
                    }}
                    className="text-gray-400 hover:text-white text-sm"
                >
                    Çıkış
                </button>
            </nav>
            <h1 className="text-xl font-semibold mb-2">Kategori eşlemesi</h1>
            <p className="text-gray-400 text-sm mb-4">
                Eşlemeler veritabanında tutuluyor; Excel/ODS açmana veya oraya yazmana gerek yok. Yeni gelen market kategori kodları için aşağıdan kategori yolu seçip Kaydet yeterli; sonraki taramalarda otomatik uygulanır.
            </p>
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={async () => {
                        const res = await fetch('/api/admin/export-mappings', { credentials: 'include' });
                        if (!res.ok) return;
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `kategori-eslemeleri-${new Date().toISOString().slice(0, 10)}.tsv`;
                        a.click();
                        URL.revokeObjectURL(url);
                    }}
                    className="inline-flex items-center rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
                >
                    Eşlemeleri dışa aktar (TSV yedek)
                </button>
                <span className="text-gray-500 text-xs">İsteğe bağlı: yedek için indir; düzenlemen gerekmez.</span>
            </div>
            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-900/30 text-red-200 text-sm">
                    {error}
                </div>
            )}
            {pending.length === 0 ? (
                <p className="text-gray-500">Bekleyen market kategori kodu yok. Tüm ürünler eşlenmiş veya henüz tarama yapılmadı.</p>
            ) : (
                <div className="space-y-4">
                    {pending.map((row) => (
                        <PendingRowForm
                            key={`${row.marketName}\t${row.marketCategoryCode}`}
                            row={row}
                            categoryTree={categoryTree}
                            categoryOptions={categoryOptions}
                            onSaveMapping={handleSaveMapping}
                            onAddManuel={handleAddManuel}
                            onSaveProduct={handleSaveProduct}
                            createCategory={createCategory}
                            saving={saving === `${row.marketName}\t${row.marketCategoryCode}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function ThreeLevelCategorySelect({
    categoryTree,
    value,
    onChange,
    className = '',
    createCategory,
}: {
    categoryTree: TreeNode[];
    value: string;
    onChange: (categoryId: string) => void;
    className?: string;
    /** Yeni kategori eklemek için: (parentId, name) => Promise<yeniKategoriId>. Verilmezse "Yeni ekle" gösterilmez. */
    createCategory?: (parentId: string | null, name: string) => Promise<string>;
}) {
    const roots = categoryTree;
    const [rootId, setRootId] = useState('');
    const [level2Id, setLevel2Id] = useState('');
    const [level3Id, setLevel3Id] = useState('');
    const [addingLevel, setAddingLevel] = useState<0 | 1 | 2 | 3>(0);
    const [newName, setNewName] = useState('');
    const [creating, setCreating] = useState(false);
    const root = roots.find((r) => r.id === rootId);
    const level2 = root?.children?.find((c) => c.id === level2Id);
    const level3Options = level2?.children ?? [];
    const level2Options = root?.children ?? [];

    const syncFromValue = (id: string) => {
        if (!id) {
            setRootId('');
            setLevel2Id('');
            setLevel3Id('');
            return;
        }
        for (const r of roots) {
            if (r.id === id) {
                setRootId(r.id);
                setLevel2Id('');
                setLevel3Id('');
                return;
            }
            for (const c of r.children ?? []) {
                if (c.id === id) {
                    setRootId(r.id);
                    setLevel2Id(c.id);
                    setLevel3Id('');
                    return;
                }
                for (const d of c.children ?? []) {
                    if (d.id === id) {
                        setRootId(r.id);
                        setLevel2Id(c.id);
                        setLevel3Id(d.id);
                        return;
                    }
                }
            }
        }
    };

    React.useEffect(() => {
        syncFromValue(value);
    }, [value, categoryTree]);

    const emit = (id: string) => {
        onChange(id);
    };

    const handleAddNew = async () => {
        if (!createCategory || !newName.trim()) return;
        const parentId = addingLevel === 1 ? null : addingLevel === 2 ? rootId : level2Id;
        if (addingLevel === 2 && !rootId) return;
        if (addingLevel === 3 && !level2Id) return;
        setCreating(true);
        try {
            const id = await createCategory(parentId, newName.trim());
            emit(id);
            setAddingLevel(0);
            setNewName('');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className={`flex flex-wrap items-end gap-2 ${className}`}>
            <div className="flex flex-wrap gap-2">
                <select
                    value={rootId}
                    onChange={(e) => {
                        const id = e.target.value;
                        setRootId(id);
                        setLevel2Id('');
                        setLevel3Id('');
                        emit(id || '');
                    }}
                    className="rounded-lg border border-gray-600 bg-gray-800 text-gray-100 px-3 py-2 text-sm"
                >
                    <option value="">Ana kategori</option>
                    {roots.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                </select>
                <select
                    value={level2Id}
                    onChange={(e) => {
                        const id = e.target.value;
                        setLevel2Id(id);
                        setLevel3Id('');
                        const node = level2Options.find((c) => c.id === id);
                        const diger = node?.children?.find((d: TreeNode) => (d.name || '').trim().toLowerCase() === 'diğer');
                        emit(diger?.id || id || rootId || '');
                    }}
                    className="rounded-lg border border-gray-600 bg-gray-800 text-gray-100 px-3 py-2 text-sm"
                >
                    <option value="">Yaprak</option>
                    {level2Options.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
                <select
                    value={level3Id}
                    onChange={(e) => {
                        const id = e.target.value;
                        setLevel3Id(id);
                        if (id) {
                            emit(id);
                        } else {
                            const diger = level3Options.find((d: TreeNode) => (d.name || '').trim().toLowerCase() === 'diğer');
                            emit(diger?.id || level2Id || rootId || '');
                        }
                    }}
                    className="rounded-lg border border-gray-600 bg-gray-800 text-gray-100 px-3 py-2 text-sm"
                >
                    <option value="">İnce yaprak</option>
                    {level3Options.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
            </div>
            {createCategory && (
                <div className="flex flex-wrap gap-1 text-xs">
                    <button type="button" onClick={() => setAddingLevel(1)} className="text-gray-400 hover:text-gray-200">➕ Yeni ana</button>
                    <span className="text-gray-600">|</span>
                    <button type="button" onClick={() => setAddingLevel(2)} disabled={!rootId} className="text-gray-400 hover:text-gray-200 disabled:opacity-50">➕ Yeni yaprak</button>
                    <span className="text-gray-600">|</span>
                    <button type="button" onClick={() => setAddingLevel(3)} disabled={!level2Id} className="text-gray-400 hover:text-gray-200 disabled:opacity-50">➕ Yeni ince yaprak</button>
                </div>
            )}
            {addingLevel !== 0 && (
                <div className="w-full flex flex-wrap items-center gap-2 mt-1 p-2 rounded-lg bg-gray-800/80 border border-gray-600">
                    <span className="text-gray-400 text-sm">
                        {addingLevel === 1 ? 'Yeni ana kategori adı' : addingLevel === 2 ? 'Yeni yaprak adı' : 'Yeni ince yaprak adı'}:
                    </span>
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddNew()}
                        placeholder="Örn. Yeni Kategori"
                        className="rounded border border-gray-600 bg-gray-900 text-gray-100 px-2 py-1 text-sm min-w-[140px]"
                        autoFocus
                    />
                    <button type="button" onClick={handleAddNew} disabled={!newName.trim() || creating} className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50">
                        {creating ? 'Ekleniyor...' : 'Ekle'}
                    </button>
                    <button type="button" onClick={() => { setAddingLevel(0); setNewName(''); }} className="rounded border border-gray-600 px-2 py-1 text-xs text-gray-400 hover:bg-gray-700">İptal</button>
                </div>
            )}
        </div>
    );
}

function PendingRowForm({
    row,
    categoryTree,
    categoryOptions,
    onSaveMapping,
    onAddManuel,
    onSaveProduct,
    createCategory,
    saving,
}: {
    row: PendingRow;
    categoryTree: TreeNode[];
    categoryOptions: CategoryOption[];
    onSaveMapping: (marketName: string, marketCategoryCode: string, categoryId: string) => void;
    onAddManuel: (marketName: string, marketCategoryCode: string) => void;
    onSaveProduct: (productId: string, categoryId: string, onProductSaved?: () => void) => void;
    createCategory?: (parentId: string | null, name: string) => Promise<string>;
    saving: boolean;
}) {
    const [categoryId, setCategoryId] = useState('');
    const [expanded, setExpanded] = useState(false);
    const [products, setProducts] = useState<PendingProduct[] | null>(null);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [productSelections, setProductSelections] = useState<Record<string, string>>({});
    const [savingBulk, setSavingBulk] = useState(false);
    const [bulkError, setBulkError] = useState<string | null>(null);

    const allDone = row.isManuel && products !== null && products.length > 0 && products.every((p) => p.categoryId);

    const pendingBulkCount = products?.filter((p) => !p.categoryId && productSelections[p.id])?.length ?? 0;
    const canBulkSave = row.isManuel && pendingBulkCount > 0 && !savingBulk;

    const fetchProducts = async () => {
        setLoadingProducts(true);
        try {
            const res = await fetch(
                `/api/admin/pending-category-products?marketName=${encodeURIComponent(row.marketName)}&marketCategoryCode=${encodeURIComponent(row.marketCategoryCode)}`,
                { credentials: 'include' }
            );
            const data = await res.json().catch(() => ({}));
            setProducts(data.products ?? []);
        } finally {
            setLoadingProducts(false);
        }
    };

    const onProductSaved = () => {
        fetchProducts();
    };

    const handleBulkSave = async () => {
        if (!products || pendingBulkCount === 0) return;
        const toSave = products.filter((p) => !p.categoryId && productSelections[p.id]);
        if (toSave.length === 0) return;
        setSavingBulk(true);
        try {
            const results = await Promise.all(
                toSave.map((p) =>
                    fetch('/api/admin/product-category', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ productId: p.id, categoryId: productSelections[p.id] }),
                    })
                )
            );
            const failed = results.find((r) => !r.ok);
            if (failed) {
                const data = await failed.json().catch(() => ({}));
                setBulkError(data?.error || 'Bazı ürünler kaydedilemedi');
            } else {
                setBulkError(null);
            }
            await fetchProducts();
        } finally {
            setSavingBulk(false);
        }
    };

    return (
        <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-4">
            <div className="flex flex-wrap items-end gap-3">
                {allDone && (
                    <span className="inline-flex items-center gap-1.5 rounded bg-green-900/40 text-green-300 px-2 py-0.5 text-sm" title="Tüm ürünlere yol atandı">
                        <span>✓</span>
                        <span>Tümü tamamlandı</span>
                    </span>
                )}
                <div className="min-w-[100px]">
                    <div className="text-xs text-gray-500 mb-1">Market</div>
                    <div className="font-medium">{row.marketName}</div>
                </div>
                <div className="min-w-[160px]">
                    <div className="text-xs text-gray-500 mb-1">Market kategori kodu</div>
                    {row.isNoCode ? (
                        <div className="text-amber-400/90">(Kategori kodu yok)</div>
                    ) : (
                        <div className="font-mono text-sm text-gray-300 break-all">{row.marketCategoryCode}</div>
                    )}
                </div>
                {row.marketCategoryName && (
                    <div className="min-w-[180px] max-w-[320px]">
                        <div className="text-xs text-gray-500 mb-1">Market kategori adı</div>
                        <div className="text-sm text-gray-300 truncate" title={row.marketCategoryName}>{row.marketCategoryName}</div>
                    </div>
                )}
                <div className="min-w-[50px]">
                    <div className="text-xs text-gray-500 mb-1">Ürün</div>
                    <div className="font-medium">{row.productCount}</div>
                </div>
                {row.isManuel && (
                    <span className="rounded bg-amber-900/50 text-amber-200 px-2 py-0.5 text-xs">Manuel</span>
                )}
                {!row.isManuel && (
                    <>
                        <div className="flex-1 min-w-[200px]">
                            <div className="text-xs text-gray-500 mb-1">Kategori yolu (Ana / Yaprak / İnce yaprak)</div>
                            <ThreeLevelCategorySelect
                                categoryTree={categoryTree}
                                value={categoryId}
                                onChange={setCategoryId}
                                createCategory={createCategory}
                            />
                        </div>
                        <button
                            type="button"
                            disabled={!categoryId || saving}
                            onClick={() => onSaveMapping(row.marketName, row.marketCategoryCode, categoryId)}
                            className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none px-4 py-2 text-sm font-medium text-white"
                        >
                            {saving ? 'Kaydediliyor...' : 'Otomatik eşle'}
                        </button>
                        <button
                            type="button"
                            disabled={saving}
                            onClick={() => onAddManuel(row.marketName, row.marketCategoryCode)}
                            className="rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                        >
                            Manuel listesine al
                        </button>
                    </>
                )}
                <button
                    type="button"
                    onClick={() => {
                        if (!expanded) fetchProducts();
                        setExpanded(!expanded);
                    }}
                    className="rounded border border-gray-600 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800"
                >
                    {expanded ? 'Detayı kapat' : 'Detay'}
                </button>
            </div>
            {expanded && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                    {loadingProducts ? (
                        <p className="text-gray-500 text-sm">Yükleniyor...</p>
                    ) : products === null ? null : (
                        <>
                            {row.isManuel && products.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    <button
                                        type="button"
                                        disabled={!canBulkSave}
                                        onClick={handleBulkSave}
                                        className="rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none px-4 py-2 text-sm font-medium text-white"
                                    >
                                        {savingBulk ? 'Kaydediliyor...' : `Toplu kaydet${pendingBulkCount > 0 ? ` (${pendingBulkCount} ürün)` : ''}`}
                                    </button>
                                    {bulkError && (
                                        <span className="text-red-400 text-sm">{bulkError}</span>
                                    )}
                                </div>
                            )}
                        <ul className="space-y-2">
                            {products.map((p) => {
                                const selectedId = p.categoryId ?? productSelections[p.id] ?? '';
                                return (
                                    <li key={p.id} className="flex flex-wrap items-center gap-2 text-sm">
                                        {p.categoryId ? (
                                            <span className="inline-flex items-center gap-1 text-green-400 shrink-0" title="Kategori atandı">
                                                <span>✓</span>
                                                <span className="text-green-300">Tamamlandı</span>
                                            </span>
                                        ) : null}
                                        <span className="min-w-[180px] max-w-[320px] truncate text-gray-200 font-medium" title={p.name}>{p.name || '—'}</span>
                                        {row.isManuel && (
                                            <>
                                                <ThreeLevelCategorySelect
                                                    categoryTree={categoryTree}
                                                    value={selectedId}
                                                    onChange={(id) => setProductSelections((prev) => ({ ...prev, [p.id]: id }))}
                                                    createCategory={createCategory}
                                                />
                                                <button
                                                    type="button"
                                                    disabled={!selectedId}
                                                    onClick={() => selectedId && onSaveProduct(p.id, selectedId, onProductSaved)}
                                                    className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    Kaydet
                                                </button>
                                            </>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
