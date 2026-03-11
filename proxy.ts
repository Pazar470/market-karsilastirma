import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { USER_SESSION_COOKIE_NAME } from '@/lib/session-constants';

/**
 * Next.js 16: middleware.ts yerine proxy.ts kullanılıyor.
 * API istekleri her zaman geçer (redirect yok); sayfa istekleri oturum kontrolüne tabi.
 */
export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Tüm API istekleri geçsin — redirect API yanıtını bozuyordu (JSON yerine login HTML dönüyordu)
    if (pathname.startsWith('/api/')) {
        return NextResponse.next();
    }

    // Statik ve login sayfası
    if (
        pathname.startsWith('/_next') ||
        pathname === '/login' ||
        pathname === '/favicon.ico'
    ) {
        return NextResponse.next();
    }

    // Admin ve Tarama: kendi şifreleri var (admin_session)
    if (pathname.startsWith('/admin') || pathname.startsWith('/tarama')) {
        return NextResponse.next();
    }

    const userSession = request.cookies.get(USER_SESSION_COOKIE_NAME)?.value;
    if (!userSession) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
