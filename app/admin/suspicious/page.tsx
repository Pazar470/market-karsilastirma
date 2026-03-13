'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface SuspiciousItem {
    id: string;
    name: string;
    categoryName: string | null;
    categorySlug: string | null;
    quantityAmount: number | null;
    quantityUnit: string | null;
    price: number | null;
    unitPrice: number | null;
    lastPriceDate: string | null;
}

export default function AdminSuspiciousPage() {
    const [list, setList] = useState<SuspiciousItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [approvingId, setApprovingId] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/suspicious', { credentials: 'include' });
            if (res.status === 401) {
                window.location.href = '/admin';
                return;
            }
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data?.error || `Sunucu hatası (${res.status})`);
                setList([]);
                return;
            }
            setList(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleApprove = async (productId: string) => {
        setApprovingId(productId);
        try {
            const res = await fetch('/api/admin/suspicious', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ productId }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data?.error || 'Onaylama başarısız');
                return;
            }
            setList((prev) => prev.filter((p) => p.id !== productId));
        } finally {
            setApprovingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-6 max-w-4xl mx-auto">
            <nav className="flex items-center gap-4 mb-6 border-b border-gray-700 pb-4">
                <Link href="/admin" className="text-blue-400 hover:underline">← Admin (Kategori eşlemesi)</Link>
                <span className="text-gray-500">|</span>
                <span className="font-medium text-gray-200">Şüpheli ürünler (A101)</span>
            </nav>
            <h1 className="text-xl font-semibold mb-2">Şüpheli ürünler</h1>
            <p className="text-gray-400 text-sm mb-4">
                Bu ürünler A101’de kategorideki en ucuz üründen en az %20 daha ucuz ve son 7 gündür fiyatı değişmemiş olarak işaretlendi. Listede sadece admin görür; kullanıcıya gösterilmez. &quot;Gösterilebilir yap&quot; ile onaylayınca listeden çıkar ve kullanıcıya görünür olur. Yeni fiyat gelince otomatik onaylanır.
            </p>
            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-900/30 text-red-200 text-sm">
                    {error}
                </div>
            )}
            <div className="mb-4">
                <button
                    type="button"
                    disabled={loading}
                    onClick={() => load()}
                    className="inline-flex items-center rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 disabled:opacity-50"
                >
                    {loading ? 'Yükleniyor…' : 'Listeyi yenile'}
                </button>
            </div>
            {loading ? (
                <p className="text-gray-500">Yükleniyor...</p>
            ) : list.length === 0 ? (
                <p className="text-gray-500">Şu an şüpheli ürün yok.</p>
            ) : (
                <ul className="space-y-3">
                    {list.map((item) => (
                        <li
                            key={item.id}
                            className="rounded-xl border border-gray-700 bg-gray-900/50 p-4 flex flex-wrap items-center justify-between gap-3"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="font-medium text-gray-200 truncate" title={item.name}>{item.name}</div>
                                <div className="text-sm text-gray-500 mt-0.5">
                                    {item.categoryName && <span>{item.categoryName}</span>}
                                    {item.price != null && (
                                        <span className="ml-2">
                                            {item.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                            {item.unitPrice != null && item.quantityUnit && (
                                                <span className="text-gray-400"> · {item.unitPrice.toFixed(2)} ₺/{item.quantityUnit}</span>
                                            )}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                disabled={approvingId === item.id}
                                onClick={() => handleApprove(item.id)}
                                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white shrink-0"
                            >
                                {approvingId === item.id ? 'Kaydediliyor...' : 'Gösterilebilir yap'}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
