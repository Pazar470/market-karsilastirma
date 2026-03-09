'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type TaramaStatus = {
    phase: 'idle' | 'indirme' | 'yukleme' | 'alarm' | 'bitti' | 'hata';
    currentMarket: string | null;
    currentCategory: string | null;
    markets: Record<string, { urunSayisi: number; hataSayisi: number }>;
    toplamUrun: number;
    toplamHata: number;
    message: string;
    lastUpdated: string;
    startedAt: string | null;
    finishedAt: string | null;
};

const PHASE_LABELS: Record<string, string> = {
    idle: 'Tarama yok',
    indirme: 'İndirme (marketlerden veri çekiliyor)',
    yukleme: 'Yükleme (Supabase\'e yazılıyor)',
    alarm: 'Alarm kontrolü',
    bitti: 'Tamamlandı',
    hata: 'Hata ile sonlandı',
};

export default function TaramaPage() {
    const [status, setStatus] = useState<TaramaStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState<boolean | null>(null);
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/tarama/status', { credentials: 'include' });
            if (res.status === 401) {
                setAuthenticated(false);
                setStatus(null);
                setLoading(false);
                return;
            }
            const data = await res.json();
            setStatus(data);
            setAuthenticated(true);
        } catch {
            setStatus(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    useEffect(() => {
        if (authenticated !== true || status === null) return;
        const interval = setInterval(fetchStatus, 2000);
        return () => clearInterval(interval);
    }, [authenticated, status]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ password: loginPassword }),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setLoginError(data?.error || 'Giriş başarısız');
            return;
        }
        setLoginPassword('');
        setAuthenticated(true);
        setLoading(true);
        await fetchStatus();
    };

    if (authenticated === false) {
        return (
            <div className="min-h-screen bg-gray-950 text-gray-100 p-6 flex items-center justify-center">
                <div className="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-900/50 p-6">
                    <h1 className="text-lg font-semibold mb-2">Tarama izleme</h1>
                    <p className="text-gray-400 text-sm mb-4">Bu sayfa şifre korumalıdır. Admin şifresini girerek eriş.</p>
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

    if (loading && !status) {
        return (
            <div className="container mx-auto py-10 px-4">
                <p className="text-gray-500">Yükleniyor…</p>
            </div>
        );
    }

    const s = status || ({} as TaramaStatus);
    const phaseLabel = PHASE_LABELS[s.phase] ?? s.phase;
    const marketNames = Object.keys(s.markets || {}).sort();

    return (
        <div className="container mx-auto py-10 px-4 max-w-3xl">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                    Tarama İzleme
                </h1>
                <button
                    type="button"
                    onClick={async () => {
                        await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
                        setAuthenticated(false);
                        setStatus(null);
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                    Çıkış
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Aşama</span>
                    <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                            s.phase === 'bitti'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : s.phase === 'hata'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                  : s.phase === 'idle'
                                    ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}
                    >
                        {phaseLabel}
                    </span>
                </div>
                {s.message && (
                    <p className="text-gray-700 dark:text-gray-300 mb-4">{s.message}</p>
                )}
                {s.currentMarket && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <strong>Şu an taranan market:</strong> {s.currentMarket}
                    </p>
                )}
                {s.currentCategory && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <strong>Kategori:</strong> {s.currentCategory}
                    </p>
                )}
                {s.lastUpdated && (
                    <p className="text-xs text-gray-400 mt-2">
                        Son güncelleme: {new Date(s.lastUpdated).toLocaleString('tr-TR')}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Toplam taranan ürün</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {(s.toplamUrun ?? 0).toLocaleString('tr-TR')}
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Toplam hata (kategori)</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {(s.toplamHata ?? 0).toLocaleString('tr-TR')}
                    </p>
                </div>
            </div>

            <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">
                Market bazında
            </h2>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Market
                            </th>
                            <th className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Taranan ürün sayısı
                            </th>
                            <th className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Hata sayısı
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {marketNames.length > 0 ? (
                            marketNames.map((name) => (
                                <tr key={name} className="bg-white dark:bg-gray-800">
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                        {name}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                        {(s.markets[name]?.urunSayisi ?? 0).toLocaleString('tr-TR')}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                        {(s.markets[name]?.hataSayisi ?? 0).toLocaleString('tr-TR')}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={3} className="px-4 py-4 text-gray-500 text-center">
                                    Henüz veri yok. Tarama başlatmak için terminalde:{' '}
                                    <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-sm">
                                        npx tsx scripts/run-full-scan-offline.ts
                                    </code>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
