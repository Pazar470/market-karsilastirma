'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Bell, LogOut, AlarmClock } from 'lucide-react';
import { NotificationCenter } from '@/components/notification-center';
import { cn } from '@/lib/utils';

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
    const [notificationOpen, setNotificationOpen] = useState(false);
    const isAlarms = pathname.startsWith('/alarms');
    const isHome = pathname === '/';

    return (
        <>
            {/* Üst bar: mobilde sadece home ikonu, masaüstünde tam menü */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40 safe-area-inset-top">
                <div className="container mx-auto px-3 sm:px-4 h-12 sm:h-14 flex items-center justify-between">
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
                        <button
                            type="button"
                            onClick={() => setNotificationOpen(true)}
                            className="relative p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1.5"
                            aria-label="Bildirimler"
                        >
                            <Bell className="w-5 h-5" />
                            <span className="text-sm font-medium">Bildirimler</span>
                        </button>
                    </nav>

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
                <div className="grid grid-cols-4 h-14">
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
                            'flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
                            isAlarms ? 'text-blue-600' : 'text-gray-500'
                        )}
                    >
                        <AlarmClock className="w-5 h-5" />
                        <span>Alarmlar</span>
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
