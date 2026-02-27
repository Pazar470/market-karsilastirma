
import { NextResponse } from 'next/server';
import { runFullScrapeBatch } from '@/lib/scraper';
import { checkAlarmsAfterScrape } from '@/lib/alarm-engine';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    // Basic security check (Secret Header from Vercel)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        console.log('⏰ CRON: Starting Nightly Scan & Alarm Check...');

        // 1. Run Scrapers for all markets
        // In a real Vercel Cron, we might want to split these or use a queue
        // For now, we trigger a manageable batch for each market
        await runFullScrapeBatch('Migros', 100);
        await runFullScrapeBatch('A101', 100);
        await runFullScrapeBatch('Sok', 50);

        // 2. Run Alarm Engine
        console.log('⏰ CRON: Triggering Alarm Engine...');
        await checkAlarmsAfterScrape();

        return NextResponse.json({
            success: true,
            message: 'Scan and Alarm check completed successfully.'
        });
    } catch (error: any) {
        console.error('❌ CRON Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
