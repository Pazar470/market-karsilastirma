'use client';

import { useRouter } from 'next/navigation';

export function UserLogout() {
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
            className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
        >
            Çıkış
        </button>
    );
}
