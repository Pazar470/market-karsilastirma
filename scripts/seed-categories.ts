
import { prisma } from '../lib/db';

const MASTER_CATEGORIES = [
    {
        name: 'Meyve & Sebze',
        slug: 'meyve-sebze',
        children: [
            { name: 'Meyve', slug: 'meyve' },
            { name: 'Sebze', slug: 'sebze' }
        ]
    },
    {
        name: 'Et & Tavuk & Şarküteri',
        slug: 'et-tavuk-sarkuteri',
        children: [
            { name: 'Tavuk', slug: 'tavuk' },
            { name: 'Kırmızı Et', slug: 'kirmizi-et' },
            { name: 'Şarküteri', slug: 'sarkuteri' }, // Sucuk, Salam, Sosis
            { name: 'Balık & Deniz Mahsulleri', slug: 'balik-deniz-mahsulleri' }
        ]
    },

    {
        name: 'Süt & Kahvaltılık',
        slug: 'sut-kahvaltilik',
        children: [
            { name: 'Süt', slug: 'sut' },
            { name: 'Yoğurt', slug: 'yogurt' },
            { name: 'Beyaz Peynir', slug: 'beyaz-peynir' },
            { name: 'Kaşar Peyniri', slug: 'kasar-peyniri' },
            { name: 'Diğer Peynirler', slug: 'diger-peynir' }, // Labne, Krem, Tulum vs
            { name: 'Tereyağı & Margarin', slug: 'tereyagi-margarin' },
            { name: 'Yumurta', slug: 'yumurta' },
            { name: 'Zeytin', slug: 'zeytin' },
            { name: 'Bal & Reçel & Ezme', slug: 'bal-recel-ezme' }
        ]
    },
    {
        name: 'Temel Gıda',
        slug: 'temel-gida',
        children: [
            { name: 'Ayçiçek Yağı', slug: 'aycicek-yagi' },
            { name: 'Zeytinyağı', slug: 'zeytinyagi' },
            { name: 'Diğer Yağlar', slug: 'diger-yaglar' }, // Mısır, Fındık vs
            { name: 'Bakliyat', slug: 'bakliyat' },
            { name: 'Makarna', slug: 'makarna' },
            { name: 'Un', slug: 'un' },
            { name: 'Pastane Malzemeleri', slug: 'pastane-malzemeleri' },
            { name: 'Şeker', slug: 'seker' },
            { name: 'Tuz', slug: 'tuz' },
            { name: 'Baharat', slug: 'baharat' },
            { name: 'Salça', slug: 'salca' },
            { name: 'Soslar', slug: 'soslar' },
            { name: 'Konserve', slug: 'konserve' }
        ]
    },
    {
        name: 'İçecek',
        slug: 'icecek',
        children: [
            { name: 'Su & Maden Suyu', slug: 'su-maden-suyu' },
            { name: 'Gazlı İçecekler', slug: 'gazli-icecekler' },
            { name: 'Meyve Suyu', slug: 'meyve-suyu' },
            { name: 'Çay', slug: 'cay' },
            { name: 'Kahve', slug: 'kahve' },
            { name: 'Ayran & Kefir', slug: 'ayran-kefir' }
        ]
    },
    {
        name: 'Atıştırmalık',
        slug: 'atistirmalik',
        children: [
            { name: 'Çikolata & Gofret', slug: 'cikolata-gofret' },
            { name: 'Bisküvi & Kek', slug: 'biskuvi-kek' },
            { name: 'Cips & Çerez', slug: 'cips-cerez' }
        ]
    },
    {
        name: 'Fırın & Pastane',
        slug: 'firin-pastane',
        children: [
            { name: 'Ekmek', slug: 'ekmek' },
            { name: 'Unlu Mamüller', slug: 'unlu-mamuller' }
        ]
    },
    {
        name: 'Dondurulmuş Ürünler',
        slug: 'dondurulmus-urunler',
        children: []
    },
    {
        name: 'Temizlik',
        slug: 'temizlik',
        children: [
            { name: 'Çamaşır Yıkama', slug: 'camasir-yikama' },
            { name: 'Bulaşık Yıkama', slug: 'bulasik-yikama' },
            { name: 'Ev Temizliği', slug: 'ev-temizligi' },
            { name: 'Kağıt Ürünleri', slug: 'kagit-urunleri' } // Tuvalet kağıdı, havlu
        ]
    },
    {
        name: 'Kişisel Bakım',
        slug: 'kisisel-bakim',
        children: [
            { name: 'Saç Bakım', slug: 'sac-bakim' },
            { name: 'Vücut & Cilt Bakım', slug: 'vucut-cilt-bakim' },
            { name: 'Ağız Bakım', slug: 'agiz-bakim' },
            { name: 'Islak Mendil & Havlu', slug: 'islak-mendil' } // NEW: Critical for separation
        ]
    },
    {
        name: 'Ev & Yaşam',
        slug: 'ev-yasam',
        children: [
            { name: 'Ev Gereçleri', slug: 'ev-gerecleri' },
            { name: 'Elektronik', slug: 'elektronik' },
            { name: 'Kırtasiye', slug: 'kirtasiye' },
            { name: 'Giyim & Aksesuar', slug: 'giyim-aksesuar' },
            { name: 'Evcil Hayvan', slug: 'evcil-hayvan' }
        ]
    },
    {
        name: 'Oyuncak',
        slug: 'oyuncak',
        children: [
            { name: 'Oyuncaklar', slug: 'oyuncaklar' }
        ]
    },
    {
        name: 'Spor & Outdoor',
        slug: 'spor-outdoor',
        children: [
            { name: 'Sporcu Takviyeleri', slug: 'sporcu-takviyeleri' }
        ]
    },
    {
        name: 'Diğer',
        slug: 'diger',
        children: [
            { name: 'Diğer Gıda', slug: 'diger-gida' },
            { name: 'Diğer Ürünler', slug: 'diger-urunler' }
        ]
    }
];

async function seedCategories() {
    console.log('--- Seeding Master Categories ---');

    for (const cat of MASTER_CATEGORIES) {
        console.log(`Processing: ${cat.name}`);

        // Create/Update Parent
        const parent = await prisma.category.upsert({
            where: { slug: cat.slug },
            update: { name: cat.name },
            create: { name: cat.name, slug: cat.slug }
        });

        // Create/Update Children
        for (const child of cat.children) {
            await prisma.category.upsert({
                where: { slug: child.slug },
                update: { name: child.name, parentId: parent.id },
                create: { name: child.name, slug: child.slug, parentId: parent.id }
            });
        }
    }

    console.log('Categories seeded successfully.');
}

seedCategories()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
