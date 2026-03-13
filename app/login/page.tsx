'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, ArrowRight, ShoppingCart } from 'lucide-react';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 18_000);
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username: username.trim(), pin }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                router.push('/');
                router.refresh();
            } else {
                setError(data?.error || 'Giriş yapılamadı.');
            }
        } catch (err) {
            const isAbort = err instanceof Error && err.name === 'AbortError';
            setError(isAbort ? 'Bağlantı gecikti. Lütfen tekrar deneyin.' : 'Bağlantı hatası oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-3xl shadow-2xl mb-6 shadow-blue-500/20">
                        <ShoppingCart className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Market Karşılaştırma</h1>
                    <p className="text-gray-400">Giriş yap veya yeni hesap oluştur</p>
                </div>

                <div className="bg-gray-800 p-8 rounded-3xl shadow-2xl border border-gray-700/50">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Kullanıcı adı</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Kullanıcı adı"
                                    className="w-full bg-gray-900/50 border border-gray-700 text-white pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                                    required
                                    minLength={2}
                                    autoComplete="username"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">PIN (en az 4 karakter)</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="password"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    placeholder="••••"
                                    className="w-full bg-gray-900/50 border border-gray-700 text-white pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                                    required
                                    minLength={4}
                                    autoComplete="current-password"
                                />
                            </div>
                            {error && <p className="mt-3 text-sm text-red-500 flex items-center gap-1">⚠ {error}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? 'Giriş yapılıyor...' : 'Giriş yap / Kayıt ol'}
                            {!loading && <ArrowRight className="w-5 h-5" />}
                        </button>
                    </form>
                    <p className="mt-4 text-center text-sm text-gray-500">
                        Hesabınız yoksa aynı formla kayıt olursunuz; kullanıcı adı ve PIN sadece sizin alarmlarınız için kullanılır.
                    </p>
                </div>
            </div>
        </div>
    );
}
