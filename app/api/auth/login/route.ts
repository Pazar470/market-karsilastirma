import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createUserSessionCookie } from '@/lib/user-session';

export const dynamic = 'force-dynamic';

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

        let user = await prisma.user.findUnique({ where: { username } });

        if (!user) {
            user = await prisma.user.create({
                data: { username, pin },
            });
        } else if (user.pin !== pin) {
            return NextResponse.json({ error: 'Yanlış PIN' }, { status: 401 });
        }

        const { name, value, options } = createUserSessionCookie(user.id, user.username);
        const res = NextResponse.json({ success: true, username: user.username });
        res.cookies.set(name, value, options);
        return res;
    } catch (e) {
        console.error('POST /api/auth/login', e);
        return NextResponse.json({ error: 'Giriş yapılamadı' }, { status: 500 });
    }
}
