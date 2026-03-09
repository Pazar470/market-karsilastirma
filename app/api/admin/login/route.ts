import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'admin_session';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 1 gün

function tokenFromPassword(password: string): string {
    return crypto.createHmac('sha256', password).update('admin').digest('hex');
}

export async function POST(request: Request) {
    const secret = process.env.ADMIN_PASSWORD;
    if (!secret) {
        return NextResponse.json({ error: 'Admin şifre ayarlı değil' }, { status: 500 });
    }
    const body = await request.json().catch(() => ({}));
    const password = (body.password ?? '').toString();
    if (!password) {
        return NextResponse.json({ error: 'Şifre gerekli' }, { status: 400 });
    }
    if (password !== secret) {
        return NextResponse.json({ error: 'Yanlış şifre' }, { status: 401 });
    }
    const token = tokenFromPassword(secret);
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: COOKIE_MAX_AGE,
    });
    return NextResponse.json({ success: true });
}
