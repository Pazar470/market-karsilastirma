import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { USER_SESSION_COOKIE_NAME } from '@/lib/user-session';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Statik, auth API ve login sayfası
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/api/admin') ||
        pathname.startsWith('/login') ||
        pathname === '/favicon.ico'
    ) {
        return NextResponse.next();
    }

    // Admin ve Tarama: kendi şifreleri var (admin_session), middleware sadece site oturumuna bakmaz
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
    matcher: ['/((?!api/cron|_next/static|_next/image|favicon.ico).*)'],
};
