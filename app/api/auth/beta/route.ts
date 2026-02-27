
import { NextResponse } from 'next/server';

const BETA_PASSWORD = process.env.BETA_PASSWORD || 'market2026';

export async function POST(req: Request) {
    try {
        const { password } = await req.json();

        if (password === BETA_PASSWORD) {
            const response = NextResponse.json({ success: true });

            // Set session cookie for 30 days
            response.cookies.set('beta_auth', 'true', {
                path: '/',
                maxAge: 60 * 60 * 24 * 30,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax'
            });

            return response;
        }

        return NextResponse.json({ error: 'Hatalı şifre' }, { status: 401 });
    } catch (error) {
        return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 });
    }
}
