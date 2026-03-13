import { NextResponse } from 'next/server';
import { runFullScrapeBatch } from '@/lib/scraper';
import { runSokCategoryDiscovery } from '@/lib/sok-category-discovery';
import { runMigrosCategoryDiscovery } from '@/lib/migros-category-discovery';
import { runA101CategoryDiscovery } from '@/lib/a101-category-discovery';
import { checkAlarmsAfterScrape } from '@/lib/alarm-engine';
import { syncMappingToNullProducts } from '@/lib/category-sync';
import { runSuspiciousA101Check } from '@/lib/suspicious-a101';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    // Basic security check (Secret Header from Vercel)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        console.log('⏰ CRON: Starting Nightly Scan & Alarm Check...');

        // 1. Kategori keşfi + Scrapers (yaprak listeleri her turda güncel)
        await runMigrosCategoryDiscovery({ silent: true });
        await runFullScrapeBatch('Migros', 0);
        await runA101CategoryDiscovery({ silent: true, sitemapCheck: true });
        await runFullScrapeBatch('A101', 0);
        await runSuspiciousA101Check();
        console.log('⏰ CRON: Şok kategori listesi güncelleniyor...');
        await runSokCategoryDiscovery({ silent: true });
        await runFullScrapeBatch('Sok', 0);

        // 2. Mapping senkronu: Mapping'te olan (market, kod) için null ürünleri günceller (ODS her taramada okunmaz)
        console.log('⏰ CRON: Sync mapping to null products...');
        const mappingUpdated = await syncMappingToNullProducts(prisma);
        console.log(`⏰ CRON: Mapping ${mappingUpdated} ürün güncellendi.`);

        // 3. Run Alarm Engine
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
