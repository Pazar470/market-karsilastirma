import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireAdmin } from '@/lib/admin-auth';

/** Tarama izleme: scrape-status.json dosyasını döndürür. Admin şifresi gerekir; URL ile şifresiz erişim yok. */
export const dynamic = 'force-dynamic';

export async function GET() {
    const unauth = await requireAdmin();
    if (unauth) return unauth;

    const filePath = path.join(process.cwd(), 'scrape-status.json');
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({
            phase: 'idle',
            currentMarket: null,
            currentCategory: null,
            markets: {},
            toplamUrun: 0,
            toplamHata: 0,
            message: 'Tarama çalışmıyor. Başlatmak için: npx tsx scripts/run-full-scan-offline.ts',
            lastUpdated: new Date().toISOString(),
            startedAt: null,
            finishedAt: null,
        });
    }
}
