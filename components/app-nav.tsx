'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Home, Bell, LogOut, AlarmClock, ShoppingCart, Star } from 'lucide-react';
import { NotificationCenter } from '@/components/notification-center';
import { useBasket } from '@/context/basket-context';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

function UserLogoutNav() {
    const router = useRouter();
    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        router.push('/login');
        router.refresh();
    };
    return (
        <button
            type="button"
            onClick={handleLogout}
            className="text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-1.5"
            aria-label="Çıkış"
        >
            <LogOut className="w-5 h-5 md:w-4 md:h-4 shrink-0" />
            <span>Çıkış</span>
        </button>
    );
}

export function AppNav() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [notificationOpen, setNotificationOpen] = useState(false);
    const { totalItems, items } = useBasket();
    const totalPrice = items.reduce((sum, item) => sum + (item.addedPrice * item.quantity), 0);
    const isAlarms = pathname.startsWith('/alarms');
    const isHome = pathname === '/';
    const isBasket = pathname === '/basket';
    const isFollowed = pathname.startsWith('/takip-edilen');

    // Mobil ana sayfa için mini arama çubuğu (üst barda)
    const urlQuery = searchParams.get('q') || '';
    const [mobileQuery, setMobileQuery] = useState(urlQuery);
    useEffect(() => {
        setMobileQuery(urlQuery);
    }, [urlQuery]);

    const router = useRouter();
    const handleMobileSearchSubmit = (e: FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams(searchParams.toString());
        if (!mobileQuery.trim()) {
            params.delete('q');
        } else {
            params.set('q', mobileQuery.trim());
        }
        router.push(`/?${params.toString()}`);
    };

    return (
        <>
            {/* Üst bar: mobilde home + arama, masaüstünde tam menü */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40 safe-area-inset-top">
                <div className="container mx-auto px-2 sm:px-4 h-auto sm:h-12 py-1 sm:py-0 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center justify-between gap-2">
                        <Link
                            href="/"
                            className={cn(
                                'flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors',
                                isHome && 'text-blue-600'
                            )}
                            aria-label="Anasayfa"
                        >
                            <Home className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                            <span className="hidden sm:inline text-sm font-medium">Anasayfa</span>
                        </Link>

                        <nav className="hidden md:flex items-center gap-1">
                            <Link
                                href="/alarms"
                                className={cn(
                                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                    isAlarms ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                                )}
                            >
                                Fiyat Alarmları
                            </Link>
                            <Link
                                href="/takip-edilen"
                                className={cn(
                                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                    isFollowed ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                                )}
                            >
                                Takip Edilen
                            </Link>
                            <button
                                type="button"
                                onClick={() => setNotificationOpen(true)}
                                className="relative p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1.5"
                                aria-label="Bildirimler"
                            >
                                <Bell className="w-5 h-5" />
                                <span className="text-sm font-medium">Bildirimler</span>
                            </button>
                            <Link
                                href="/basket"
                                className={cn(
                                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                    isBasket ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                                )}
                                aria-label="Sepet"
                            >
                                <ShoppingCart className="w-5 h-5" />
                                <span className="text-sm">Sepet</span>
                                {totalItems > 0 && (
                                    <span className="bg-blue-600 text-white text-xs font-bold min-w-[1.25rem] h-5 px-1 rounded-full flex items-center justify-center">
                                        {totalItems}
                                    </span>
                                )}
                            </Link>
                        </nav>
                    </div>

                    {/* Mobil: ana sayfada üst barda arama çubuğu */}
                    {isHome && (
                        <form
                            onSubmit={handleMobileSearchSubmit}
                            className="flex md:hidden items-center gap-1.5"
                        >
                            <div className="relative flex-1 min-w-0">
                                <Input
                                    type="search"
                                    placeholder="Ürün ara..."
                                    value={mobileQuery}
                                    onChange={(e) => setMobileQuery(e.target.value)}
                                    className="h-9 pl-3 pr-2 text-xs"
                                />
                            </div>
                        </form>
                    )}

                    <div className="hidden md:block">
                        <UserLogoutNav />
                    </div>
                </div>
            </header>

            {/* Mobil: alt navigasyon (thumb-friendly) */}
            <nav
                className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-area-inset-bottom"
                aria-label="Ana menü"
            >
                <div className="grid grid-cols-6 h-14">
                    <Link
                        href="/"
                        className={cn(
                            'flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
                            isHome ? 'text-blue-600' : 'text-gray-500'
                        )}
                    >
                        <Home className="w-5 h-5" />
                        <span>Anasayfa</span>
                    </Link>
                    <Link
                        href="/alarms"
                        className={cn(
                            'flex flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-colors',
                            isAlarms ? 'text-amber-600' : 'text-gray-500'
                        )}
                    >
                        <AlarmClock className={cn('w-6 h-6', isAlarms && 'animate-bounce')} />
                        <span>Alarmlar</span>
                    </Link>
                    <Link
                        href="/takip-edilen"
                        className={cn(
                            'flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
                            isFollowed ? 'text-blue-600' : 'text-gray-500'
                        )}
                    >
                        <Star className="w-5 h-5" />
                        <span>Takip</span>
                    </Link>
                    <button
                        type="button"
                        onClick={() => setNotificationOpen(true)}
                        className="flex flex-col items-center justify-center gap-0.5 text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors relative"
                        aria-label="Bildirimler"
                    >
                        <Bell className="w-5 h-5" />
                        <span>Bildirimler</span>
                    </button>
                    <Link
                        href="/basket"
                        className={cn(
                            'flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors relative',
                            isBasket ? 'text-blue-600' : 'text-gray-500'
                        )}
                        aria-label="Sepet"
                    >
                        <span className="relative inline-block">
                            <ShoppingCart className="w-5 h-5" />
                            {totalItems > 0 && (
                                <span className="absolute -top-1 -right-2 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white px-1">
                                    {totalItems > 99 ? '99+' : totalItems}
                                </span>
                            )}
                        </span>
                        <span>Sepet</span>
                    </Link>
                    <div className="flex flex-col items-center justify-center gap-0.5">
                        <UserLogoutNav />
                    </div>
                </div>
            </nav>

            {/* Tek bildirim paneli: üst menü veya alt menü "Bildirimler" ile açılır */}
            <NotificationCenter
                open={notificationOpen}
                onOpenChange={setNotificationOpen}
                showTrigger={false}
            />
        </>
    );
}
