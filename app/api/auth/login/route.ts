import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createUserSessionCookie } from '@/lib/user-session';

export const dynamic = 'force-dynamic';

const DB_TIMEOUT_MS = 12_000;
const DB_SLOW_MESSAGE = 'Veritabanı geç yanıt verdi. Lütfen birkaç saniye sonra tekrar deneyin.';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('DB_TIMEOUT')), ms)
        ),
    ]);
}

/** Giriş veya kayıt: username + pin. Kullanıcı yoksa oluşturulur, varsa pin kontrol edilir. */
export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const username = String(body.username ?? '').trim().toLowerCase();
        const pin = String(body.pin ?? '').trim();

        if (!username || username.length < 2) {
            return NextResponse.json({ error: 'Kullanıcı adı en az 2 karakter olmalı' }, { status: 400 });
        }
        if (!pin || pin.length < 4) {
            return NextResponse.json({ error: 'PIN en az 4 karakter olmalı' }, { status: 400 });
        }

        let user: { id: string; username: string; pin: string } | null;
        try {
            user = await withTimeout(prisma.user.findUnique({ where: { username } }), DB_TIMEOUT_MS);
        } catch (e) {
            console.error('POST /api/auth/login findUnique', e);
            return NextResponse.json({ error: DB_SLOW_MESSAGE }, { status: 503 });
        }

        if (!user) {
            try {
                user = await withTimeout(
                    prisma.user.create({ data: { username, pin } }),
                    DB_TIMEOUT_MS
                );
            } catch (e) {
                console.error('POST /api/auth/login create', e);
                return NextResponse.json({ error: DB_SLOW_MESSAGE }, { status: 503 });
            }
        } else if (user.pin !== pin) {
            return NextResponse.json({ error: 'Yanlış PIN' }, { status: 401 });
        }

        const { name, value, options } = createUserSessionCookie(user.id, user.username);
        const res = NextResponse.json({ success: true, username: user.username });
        res.cookies.set(name, value, options);
        return res;
    } catch (e) {
        console.error('POST /api/auth/login', e);
        const isTimeout = e instanceof Error && e.message === 'DB_TIMEOUT';
        return NextResponse.json(
            { error: isTimeout ? DB_SLOW_MESSAGE : 'Giriş yapılamadı' },
            { status: isTimeout ? 503 : 500 }
        );
    }
}
