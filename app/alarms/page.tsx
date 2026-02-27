
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
    category: { name: string };
    tags: string[];
    pendingProductIds: string[];
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
            const data = await res.json();
            setAlarms(data);
        } catch (error) {
            console.error('Error fetching alarms:', error);
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
        <div className="min-h-screen bg-[#0f1115] text-white p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                            Fiyat Alarmlarım
                        </h1>
                        <p className="text-gray-400 mt-2 text-lg">Takip ettiğin ürünler ve akıllı hedeflerin.</p>
                    </div>
                    <Link
                        href="/alarms/new"
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-semibold hover:scale-105 transition-all shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                    >
                        + Yeni Alarm Kur
                    </Link>
                </div>

                {loading ? (
                    <div className="flex justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : alarms.length === 0 ? (
                    <div className="text-center p-20 bg-[#1a1d23] rounded-3xl border border-gray-800">
                        <div className="text-6xl mb-6">🔔</div>
                        <h2 className="text-2xl font-bold mb-4">Henüz alarmın yok</h2>
                        <p className="text-gray-400 mb-8 max-w-md mx-auto">
                            İstediğin ürünlerin fiyatı düştüğünde anında haberin olsun. İlk alarmını şimdi kur!
                        </p>
                        <Link
                            href="/alarms/new"
                            className="px-8 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors"
                        >
                            Alarm Oluştur
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {alarms.map((alarm) => (
                            <div
                                key={alarm.id}
                                className={`group p-6 rounded-3xl bg-[#1a1d23] border transition-all duration-300 ${alarm.isActive ? 'border-blue-500/30' : 'border-gray-800 grayscale'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                    </div>
                                    <div className="flex gap-2">
                                        <Link
                                            href={`/alarms/${alarm.id}/edit`}
                                            className="p-2 text-gray-400 hover:text-white transition-colors"
                                            title="Düzenle"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </Link>
                                        <button
                                            onClick={() => toggleAlarm(alarm.id, alarm.isActive)}
                                            className={`p-2 rounded-lg hover:bg-white/5 transition-colors ${alarm.isActive ? 'text-blue-400' : 'text-gray-500'}`}
                                            title={alarm.isActive ? 'Pasif Yap' : 'Aktif Et'}
                                        >
                                            {alarm.isActive ? (
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => deleteAlarm(alarm.id)}
                                            className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                                            title="Sil"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {alarm.pendingProductIds && alarm.pendingProductIds.length > 0 && (
                                    <div className="mb-4">
                                        <Link
                                            href={`/alarms/${alarm.id}/edit`}
                                            className="flex items-center gap-2 p-3 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400 hover:bg-blue-600/30 transition-all group"
                                        >
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                            </span>
                                            <span className="text-xs font-bold">{alarm.pendingProductIds.length} Yeni Ürün Onay Bekliyor</span>
                                            <svg className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                            </svg>
                                        </Link>
                                    </div>
                                )}

                                <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors">{alarm.name}</h3>
                                <div className="text-sm text-gray-400 mb-6 flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-gray-800 rounded-md">{alarm.category.name}</span>
                                    {alarm.tags.map(tag => (
                                        <span key={tag} className="text-blue-400/70">#{tag}</span>
                                    ))}
                                </div>

                                <div className="flex items-end justify-between">
                                    <div>
                                        <span className="text-xs text-gray-500 block mb-1">Hedef Birim Fiyat</span>
                                        <span className="text-2xl font-bold text-white">
                                            {alarm.targetPrice} ₺ <span className="text-sm font-normal text-gray-400">/ {alarm.unitType}</span>
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-gray-500 block mb-1">Son Bildirim</span>
                                        <span className="text-sm text-gray-300">
                                            {alarm.lastNotifiedAt ? new Date(alarm.lastNotifiedAt).toLocaleDateString() : 'Henüz değil'}
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
