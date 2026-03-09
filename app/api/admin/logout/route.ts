import { NextResponse } from 'next/server';

const COOKIE_NAME = 'admin_session';

export const dynamic = 'force-dynamic';

export async function POST() {
    const res = NextResponse.json({ success: true });
    res.cookies.set(COOKIE_NAME, '', {
        path: '/',
        maxAge: 0,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    });
    return res;
}
