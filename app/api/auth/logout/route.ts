import { NextResponse } from 'next/server';
import { USER_SESSION_COOKIE_NAME } from '@/lib/user-session';

export const dynamic = 'force-dynamic';

export async function POST() {
    const res = NextResponse.json({ success: true });
    res.cookies.set(USER_SESSION_COOKIE_NAME, '', {
        path: '/',
        maxAge: 0,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    });
    return res;
}
