'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, ChevronDown, Search, SlidersHorizontal } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { categorySortIndex, sortCategoriesByOrder } from '@/lib/category-order';

interface CategoryNode {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    children: CategoryNode[];
}

export function CategorySidebar() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedCategoryId = searchParams.get('categoryId');
    const urlSort = searchParams.get('sortBy') || '';
    const urlMarket = searchParams.get('market') || '';
    const [tree, setTree] = useState<CategoryNode[]>([]);
    const [categorySearch, setCategorySearch] = useState('');
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const touchStartX = useRef(0);

    useEffect(() => {
        fetch('/api/categories/tree')
            .then((res) => res.json())
            .then((data) => {
                setTree(Array.isArray(data) ? data : []);
                if (Array.isArray(data) && data.length > 0) setExpanded(new Set([data[0].id]));
            })
            .catch(() => setTree([]))
            .finally(() => setLoading(false));
    }, []);

    const handleSelectCategory = (categoryId: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (categoryId) params.set('categoryId', categoryId);
        else params.delete('categoryId');
        params.delete('category'); // eski ana kategori filtresini kaldır
        router.push(`/?${params.toString()}`);
        setIsMobileOpen(false); // Seçim yapınca panel kapansın, ürünler ekrana düşsün
    };

    const toggleExpand = (id: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const filterNode = (node: CategoryNode, q: string): CategoryNode | null => {
        const name = (node.name || '').toLowerCase();
        const match = name.includes(q);
        const filteredChildren = (node.children || [])
            .map((c) => filterNode(c, q))
            .filter((c): c is CategoryNode => c !== null);
        if (match || filteredChildren.length > 0) {
            return { ...node, children: filteredChildren };
        }
        return null;
    };

    const filteredTree = useMemo(() => {
        const q = categorySearch.trim().toLowerCase();
        const base = !q
            ? tree
            : tree
                .map((node) => filterNode(node, q))
                .filter((n): n is CategoryNode => n !== null);

        return sortCategoriesByOrder(base);
    }, [tree, categorySearch]);

    const renderNode = (node: CategoryNode, depth: number, isLeaf: boolean) => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expanded.has(node.id);
        const isSelected = selectedCategoryId === node.id;
        const name = node.name || 'Diğer';

        return (
            <div key={node.id} className="space-y-0.5" style={{ paddingLeft: depth * 12 }}>
                <div className="flex items-center gap-0.5 min-w-0">
                    {hasChildren ? (
                        <button
                            type="button"
                            onClick={() => toggleExpand(node.id)}
                            className="p-0.5 shrink-0 rounded hover:bg-gray-100"
                            aria-label={isExpanded ? 'Kapat' : 'Aç'}
                        >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                    ) : (
                        <span className="w-5 shrink-0 inline-block" />
                    )}
                    <Button
                        variant={isSelected ? 'default' : 'ghost'}
                        size="sm"
                        className={cn(
                            'flex-1 justify-start text-left whitespace-normal h-auto py-1.5 text-sm',
                            isSelected && 'bg-blue-600 text-white'
                        )}
                        onClick={() => {
                            if (hasChildren) {
                                toggleExpand(node.id);
                            } else {
                                handleSelectCategory(node.id);
                            }
                        }}
                    >
                        {name}
                    </Button>
                </div>
                {hasChildren && isExpanded && (
                    <div className="space-y-0.5">
                        {[...node.children]
                            .sort((a, b) => {
                                const aIsOther = (a.name || '').toLowerCase() === 'diğer';
                                const bIsOther = (b.name || '').toLowerCase() === 'diğer';
                                if (aIsOther && !bIsOther) return 1;
                                if (!aIsOther && bIsOther) return -1;
                                return (a.name || '').localeCompare(b.name || '');
                            })
                            .map((child) => renderNode(child, depth + 1, !(child.children?.length)))}
                    </div>
                )}
            </div>
        );
    };

    const updateUrl = (newParams: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(newParams).forEach(([key, value]) => {
            if (value === null || value === '') {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        });
        router.push(`/?${params.toString()}`);
    };

    const selectClass = 'flex h-11 w-full items-center justify_between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

    const sidebarContent = (
        <div className="bg-white rounded-lg border p-4 h-full">
            <h3 className="font-semibold mb-4 text-lg text-blue-700">Kategoriler</h3>
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
                Bazı kategorilerde yanlış ürün görünmesi marketlerin kendi site kategorilerinden kaynaklanabilir.
            </p>
            <div className="h-[calc(100vh-320px)] overflow-y-auto pr-2">
                <div className="space-y-1">
                    <Button
                        variant={selectedCategoryId === null || selectedCategoryId === '' ? 'default' : 'ghost'}
                        className={cn('w-full justify-start', (!selectedCategoryId || selectedCategoryId === '') && 'bg-blue-600 text-white')}
                        onClick={() => handleSelectCategory(null)}
                    >
                        Tüm Ürünler
                    </Button>
                    {loading ? (
                        <div className="py-4 text-sm text-gray-500">Yükleniyor...</div>
                    ) : tree.length === 0 ? (
                        <div className="py-4 text-sm text-gray-500">Kategori bulunamadı.</div>
                    ) : (
                        filteredTree.map((node) => renderNode(node, 0, !(node.children?.length)))
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobil: Kategoriler + Filtrele aynı satırda */}
            <div className="md:hidden mb-3 flex justify-between items-center gap-2">
                <button
                    type="button"
                    onClick={() => setIsMobileOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-blue-700 hover:text-blue-800 hover:bg-blue-50 border border-blue-100 bg-blue-50/60 transition-colors"
                    aria-label="Kategorileri aç"
                >
                    <span>Kategoriler</span>
                    <ChevronRight className="h-3.5 w-3.5 opacity-80" />
                </button>
                <button
                    type="button"
                    onClick={() => setFilterOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-700 hover:text-blue-700 hover:bg-gray-100 border border-gray-200 bg-white transition-colors"
                    aria-label="Filtrele"
                >
                    <SlidersHorizontal className="h-4 w-4" />
                    <span>Filtrele</span>
                </button>
                {isMobileOpen && (
                    <div className="fixed inset-0 z-40 bg-black/40 flex">
                        <div
                            className="w-11/12 max-w-xs h-full bg-white shadow-2xl animate-in slide-in-from-left duration-200 flex flex-col"
                            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
                            onTouchEnd={(e) => {
                                const dx = e.changedTouches[0].clientX - touchStartX.current;
                                if (dx < -60) setIsMobileOpen(false); // Sola kaydırınca kapat
                            }}
                        >
                            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                                <span className="font-semibold text-gray-800">Kategoriler</span>
                                <button
                                    type="button"
                                    className="text-sm text-gray-500 hover:text-gray-800"
                                    onClick={() => setIsMobileOpen(false)}
                                >
                                    Kapat
                                </button>
                            </div>
                            <div className="p-4 flex-1 overflow-y-auto">
                                {sidebarContent}
                            </div>
                        </div>
                        <button
                            type="button"
                            className="flex-1"
                            onClick={() => setIsMobileOpen(false)}
                            aria-label="Kategorileri kapat"
                        />
                    </div>
                )}
            </div>

            {/* Masaüstü: sabit sidebar */}
            <div className="hidden md:block w-64 flex-shrink-0 h-fit">
                {sidebarContent}
            </div>

            {/* Mobil: Filtrele drawer (market + sıralama) */}
            <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
                <DialogContent className="sm:max-w-[340px] rounded-t-2xl sm:rounded-lg max-h-[85vh] overflow-y-auto p-5">
                    <DialogHeader>
                        <DialogTitle className="text-lg">Market ve sıralama</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <label className="grid gap-2">
                            <span className="text-sm font-medium">Market</span>
                            <select
                                className={selectClass}
                                value={urlMarket}
                                onChange={(e) => updateUrl({ market: e.target.value })}
                            >
                                <option value="">Tüm Marketler</option>
                                <option value="A101">A101</option>
                                <option value="Şok">Şok</option>
                                <option value="Migros">Migros</option>
                                <option value="Carrefour">Carrefour (Yakında)</option>
                            </select>
                        </label>
                        <label className="grid gap-2">
                            <span className="text-sm font-medium">Sıralama</span>
                            <select
                                className={selectClass}
                                value={urlSort}
                                onChange={(e) => updateUrl({ sortBy: e.target.value })}
                            >
                                <option value="">Varsayılan</option>
                                <option value="unitPriceAsc">Birim Fiyat (En Ucuz)</option>
                                <option value="priceAsc">Fiyat (Artan)</option>
                                <option value="priceDesc">Fiyat (Azalan)</option>
                            </select>
                        </label>
                        <Button onClick={() => setFilterOpen(false)} className="h-11 mt-2">
                            Tamam
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
