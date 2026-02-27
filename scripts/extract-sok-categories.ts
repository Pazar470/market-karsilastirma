
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs';

const CATEGORIES = [
    { name: 'Yemeklik Malzemeler', url: 'https://www.sokmarket.com.tr/yemeklik-malzemeler-c-1770' },
    { name: 'Et & Tavuk & Şarküteri', url: 'https://www.sokmarket.com.tr/et-ve-tavuk-ve-sarkuteri-c-160' },
    { name: 'Meyve & Sebze', url: 'https://www.sokmarket.com.tr/meyve-ve-sebze-c-20' },
    { name: 'Süt & Süt Ürünleri', url: 'https://www.sokmarket.com.tr/sut-ve-sut-urunleri-c-460' },
    { name: 'Kahvaltılık', url: 'https://www.sokmarket.com.tr/kahvaltilik-c-890' },
    { name: 'Atıştırmalıklar', url: 'https://www.sokmarket.com.tr/atistirmaliklar-c-20376' },
    { name: 'İçecek', url: 'https://www.sokmarket.com.tr/icecek-c-20505' },
    { name: 'Ekmek & Pastane', url: 'https://www.sokmarket.com.tr/ekmek-ve-pastane-c-1250' },
    { name: 'Dondurulmuş Ürünler', url: 'https://www.sokmarket.com.tr/dondurulmus-urunler-c-1550' },
    { name: 'Dondurma', url: 'https://www.sokmarket.com.tr/dondurma-c-31102' },
    { name: 'Temizlik', url: 'https://www.sokmarket.com.tr/temizlik-c-20647' },
    { name: 'Kağıt Ürünler', url: 'https://www.sokmarket.com.tr/kagit-urunler-c-20875' },
    { name: 'Kişisel Bakım & Kozmetik', url: 'https://www.sokmarket.com.tr/kisisel-bakim-ve-kozmetik-c-20395' },
    { name: 'Anne - Bebek & Çocuk', url: 'https://www.sokmarket.com.tr/anne-bebek-ve-cocuk-c-20634' },
    { name: 'Oyuncak', url: 'https://www.sokmarket.com.tr/oyuncak-c-20644' },
    { name: 'Ev & Yaşam', url: 'https://www.sokmarket.com.tr/ev-ve-yasam-c-20898' },
    { name: 'Evcil Dostlar', url: 'https://www.sokmarket.com.tr/evcil-dostlar-c-20880' },
    { name: 'Giyim & Aksesuar', url: 'https://www.sokmarket.com.tr/giyim-ayakkabi-ve-aksesuar-c-20886' },
    { name: 'Elektronik', url: 'https://www.sokmarket.com.tr/elektronik-c-22769' }
];

async function extractSokCategories() {
    console.log('--- Şok Kategori Keşfi Başlatıldı ---');
    const leafCategories: any[] = [];
    const seenUrls = new Set<string>();

    for (const root of CATEGORIES) {
        try {
            console.log(`Çekiliyor: ${root.name}...`);
            const res = await fetch(root.url);
            if (!res.ok) continue;
            const html = await res.text();
            const $ = cheerio.load(html);

            $('a[href*="-c-"]').each((i, element) => {
                const href = $(element).attr('href');
                const name = $(element).text().trim();

                if (href && name) {
                    const fullUrl = `https://www.sokmarket.com.tr${href}`;
                    if (fullUrl !== root.url && !seenUrls.has(fullUrl)) {
                        seenUrls.add(fullUrl);
                        leafCategories.push({
                            id: href.split('-c-').pop(),
                            name: name,
                            path: `${root.name} > ${name}`,
                            url: fullUrl
                        });
                    }
                }
            });
        } catch (e) {
            console.error(`Hata (${root.name}):`, e);
        }
        await new Promise(r => setTimeout(r, 200));
    }

    const output = {
        market: 'Şok',
        totalLeafCategories: leafCategories.length,
        categories: leafCategories
    };

    fs.writeFileSync('sok_categories.json', JSON.stringify(output, null, 2));
    console.log(`✅ ${leafCategories.length} adet "yaprak" kategori bulundu ve sok_categories.json dosyasına kaydedildi.`);
}

extractSokCategories();
