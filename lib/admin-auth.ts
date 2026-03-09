import { cookies } from 'next/headers';
import crypto from 'crypto';

const COOKIE_NAME = 'admin_session';

function tokenFromPassword(password: string): string {
    return crypto.createHmac('sha256', password).update('admin').digest('hex');
}

/** Admin cookie geçerli mi kontrol et. Geçersizse Response döner (401), geçerliyse null. */
export async function requireAdmin(): Promise<Response | null> {
    const secret = process.env.ADMIN_PASSWORD;
    if (!secret) return new Response(JSON.stringify({ error: 'Admin şifre ayarlı değil' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    const expected = tokenFromPassword(secret);
    if (!token || token !== expected) {
        return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    return null;
}
