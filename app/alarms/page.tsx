
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Alarm {
    id: string;
    name: string;
    targetPrice: number;
    unitType: string;
    isActive: boolean;
    category: { name: string } | null;
    tags: string[];
    pendingProductIds?: string[];
    lastNotifiedAt: string | null;
}

export default function AlarmsPage() {
    const [alarms, setAlarms] = useState<Alarm[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchAlarms();
    }, []);

    const fetchAlarms = async () => {
        try {
            const res = await fetch('/api/alarms');
            if (!res.ok) throw new Error('Alarms fetch failed');
            const data = await res.json();
            setAlarms(Array.isArray(data) ? data.map((a: Alarm) => ({
                ...a,
                category: a.category ?? { name: 'Kategori' },
                tags: Array.isArray(a.tags) ? a.tags : [],
                pendingProductIds: Array.isArray(a.pendingProductIds) ? a.pendingProductIds : [],
            })) : []);
        } catch (error) {
            console.error('Error fetching alarms:', error);
            setAlarms([]);
        } finally {
            setLoading(false);
        }
    };

    const toggleAlarm = async (id: string, currentStatus: boolean) => {
        try {
            await fetch(`/api/alarms/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentStatus }),
            });
            fetchAlarms();
        } catch (error) {
            console.error('Error toggling alarm:', error);
        }
    };

    const deleteAlarm = async (id: string) => {
        if (!confirm('Bu alarmı silmek istediğinize emin misiniz?')) return;
        try {
            await fetch(`/api/alarms/${id}`, { method: 'DELETE' });
            fetchAlarms();
        } catch (error) {
            console.error('Error deleting alarm:', error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
                {/* Başlık + aksiyon: anasayfa ile aynı sade stil */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                            Fiyat Alarmlarım
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">Takip ettiğin ürünler ve hedeflerin.</p>
                    </div>
                    <Link
                        href="/alarms/new"
                        className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shrink-0"
                    >
                        + Yeni Alarm Kur
                    </Link>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-blue-600" />
                    </div>
                ) : alarms.length === 0 ? (
                    <div className="text-center py-12 sm:py-16 px-4 bg-white rounded-xl border border-gray-200">
                        <div className="text-4xl mb-4">🔔</div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Henüz alarmın yok</h2>
                        <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                            İstediğin ürünlerin fiyatı düştüğünde haberin olsun. İlk alarmını kur.
                        </p>
                        <Link
                            href="/alarms/new"
                            className="inline-block px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Alarm Oluştur
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                        {alarms.map((alarm) => (
                            <div
                                key={alarm.id}
                                className={`group p-4 sm:p-5 rounded-xl bg-white border transition-colors ${alarm.isActive ? 'border-gray-200' : 'border-gray-100 opacity-75'}`}
                            >
                                <div className="flex justify-between items-start gap-2 mb-4">
                                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                    </div>
                                    <div className="flex gap-1">
                                        <Link
                                            href={`/alarms/${alarm.id}/edit`}
                                            className="p-2 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
                                            title="Düzenle"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </Link>
                                        <button
                                            onClick={() => toggleAlarm(alarm.id, alarm.isActive)}
                                            className={`p-2 rounded-lg transition-colors ${alarm.isActive ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                            title={alarm.isActive ? 'Pasif Yap' : 'Aktif Et'}
                                        >
                                            {alarm.isActive ? (
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => deleteAlarm(alarm.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                                            title="Sil"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {Array.isArray(alarm.pendingProductIds) && alarm.pendingProductIds.length > 0 && (
                                    <div className="mb-3">
                                        <Link
                                            href={`/alarms/${alarm.id}/edit`}
                                            className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-blue-700 hover:bg-blue-100/80 transition-colors text-sm"
                                        >
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
                                            </span>
                                            <span className="font-medium">
                                                {alarm.pendingProductIds.length} ürün eşleşti
                                            </span>
                                            <svg className="w-3.5 h-3.5 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                            </svg>
                                        </Link>
                                    </div>
                                )}

                                <h3 className="text-base font-semibold text-gray-900 mb-2">{alarm.name}</h3>
                                <div className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500 mb-4">
                                    <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">{alarm.category?.name ?? 'Kategori'}</span>
                                    {alarm.tags.map(tag => (
                                        <span key={tag} className="text-blue-600/80">#{tag}</span>
                                    ))}
                                </div>

                                <div className="flex items-end justify-between pt-2 border-t border-gray-100">
                                    <div>
                                        <span className="text-xs text-gray-400 block mb-0.5">Hedef</span>
                                        <span className="text-lg font-semibold text-gray-900">
                                            {alarm.targetPrice} ₺ <span className="text-sm font-normal text-gray-500">/ {alarm.unitType}</span>
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-gray-400 block mb-0.5">Son bildirim</span>
                                        <span className="text-sm text-gray-600">
                                            {alarm.lastNotifiedAt ? new Date(alarm.lastNotifiedAt).toLocaleDateString('tr-TR') : '—'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
