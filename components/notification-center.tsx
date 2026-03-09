
'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, ExternalLink, X } from 'lucide-react';
import Link from 'next/link';

interface Notification {
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    alarmId?: string;
    createdAt: string;
}

export function NotificationCenter() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const unreadCount = notifications.filter(n => !n.isRead).length;

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Pool every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchNotifications = async () => {
        const res = await fetch('/api/notifications');
        if (res.ok) {
            const data = await res.json();
            setNotifications(data);
        }
    };

    const markAllAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
        if (unreadIds.length === 0) return;

        await fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: unreadIds })
        });
        fetchNotifications();
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center bg-red-500 text-[10px] font-bold text-white rounded-full ring-2 ring-white animate-pulse">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-transparent"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-gray-800">Bildirimler</h3>
                            <div className="flex gap-3">
                                <button
                                    onClick={markAllAsRead}
                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider"
                                >
                                    Hepsini Oku
                                </button>
                                <button onClick={() => setIsOpen(false)}>
                                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                            {notifications.length > 0 ? (
                                notifications.map(n => (
                                    <div
                                        key={n.id}
                                        className={`p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors relative ${!n.isRead ? 'bg-blue-50/30' : ''}`}
                                    >
                                        {!n.isRead && (
                                            <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full" />
                                        )}
                                        <div className="pr-4">
                                            <p className="text-sm font-bold text-gray-900 mb-1">{n.title}</p>
                                            <p className="text-xs text-gray-600 leading-relaxed mb-2">{n.message}</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-gray-400">
                                                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {n.alarmId && (
                                                    <Link
                                                        href={`/alarms/${n.alarmId}/edit`}
                                                        onClick={() => setIsOpen(false)}
                                                        className="text-[10px] font-bold text-blue-500 flex items-center gap-1 hover:underline"
                                                    >
                                                        Detaylar <ExternalLink className="w-2 h-2" />
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-10 text-center">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Bell className="w-6 h-6 text-gray-300" />
                                    </div>
                                    <p className="text-sm text-gray-500">Henüz bildirim yok.</p>
                                </div>
                            )}
                        </div>

                        {notifications.length > 0 && (
                            <div className="p-3 bg-gray-50 text-center border-t border-gray-100">
                                <Link
                                    href="/alarms"
                                    onClick={() => setIsOpen(false)}
                                    className="text-xs font-bold text-gray-500 hover:text-blue-600"
                                >
                                    Tüm Alarmları Yönet
                                </Link>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
