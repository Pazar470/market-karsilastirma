import { cookies } from 'next/headers';
import crypto from 'crypto';

import { USER_SESSION_COOKIE_NAME as COOKIE_NAME } from './session-constants';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 gün

function getSecret(): string {
    const s = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || 'market-session-dev';
    return s;
}

function sign(payload: string): string {
    return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
}

export type SessionPayload = { userId: string; username: string; exp: number };

export function createUserSessionCookie(userId: string, username: string): { name: string; value: string; options: { path: string; maxAge: number; httpOnly: boolean; secure: boolean; sameSite: 'lax' } } {
    const exp = Date.now() + MAX_AGE * 1000;
    const payload: SessionPayload = { userId, username, exp };
    const payloadStr = JSON.stringify(payload);
    const encoded = Buffer.from(payloadStr, 'utf-8').toString('base64url');
    const signature = sign(payloadStr);
    const value = `${encoded}.${signature}`;
    return {
        name: COOKIE_NAME,
        value,
        options: {
            path: '/',
            maxAge: MAX_AGE,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        },
    };
}

/** API route veya server action içinde: cookie'den session oku ve doğrula. Geçersizse null. */
export async function getSessionFromCookie(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const raw = cookieStore.get(COOKIE_NAME)?.value;
    if (!raw) return null;
    const [encoded, sig] = raw.split('.');
    if (!encoded || !sig) return null;
    let payloadStr: string;
    try {
        payloadStr = Buffer.from(encoded, 'base64url').toString('utf-8');
    } catch {
        return null;
    }
    const expectedSig = sign(payloadStr);
    if (sig !== expectedSig) return null;
    try {
        const payload = JSON.parse(payloadStr) as SessionPayload;
        if (payload.exp && payload.exp < Date.now()) return null;
        if (!payload.userId || !payload.username) return null;
        return payload;
    } catch {
        return null;
    }
}

/** Middleware'de sadece cookie var mı kontrolü (doğrulama API'de yapılır). */
export { USER_SESSION_COOKIE_NAME } from './session-constants';

/** API'de: session yoksa 401 Response döner, varsa null (devam edebilirsin) ve session bilgisi. */
export async function requireUserSession(): Promise<{ userId: string; username: string } | Response> {
    const session = await getSessionFromCookie();
    if (!session) {
        return new Response(JSON.stringify({ error: 'Oturum gerekli' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    return { userId: session.userId, username: session.username };
}
