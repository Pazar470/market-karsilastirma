
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow static files, api/auth, and the login page itself
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/login') ||
        pathname === '/favicon.ico'
    ) {
        return NextResponse.next();
    }

    const betaAuth = request.cookies.get('beta_auth')?.value;

    // If not authenticated, redirect to login
    if (betaAuth !== 'true') {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api/cron|_next/static|_next/image|favicon.ico).*)'],
};
