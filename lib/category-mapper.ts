/**
 * category-mapper.ts
 *
 * MİMARİ KURALI (CORE_RULES.md):
 * - Her ürün, marketin kendi kategorisinden gelen "yaprak isim" üzerinden
 *   bizim 16 ana kategorimizden birine eşlenir.
 * - Eşleştirme: [Market Yaprak İsmi] → [Kanonik İsim] → [Ana Kategori]
 * - Hiçbir ürün reddedilmez. Bilinmeyenler "Diğer" kategorisine düşer.
 * - Kanonik isim = alarm sayfasında gösterilen alt kategori adıdır.
 *
 * DOSYA YERİ: lib/category-mapper.ts
 * İLGİLİ DOSYALAR: lib/db-utils.ts (upsertProduct içinde çağrılır)
 */

// ─── 16 Ana Kategori (Kesin Liste) ──────────────────────────────────────────
export const ANA_KATEGORILER = {
    MEYVE_SEBZE: 'Meyve & Sebze',
    ET_TAVUK_BALIK: 'Et, Tavuk & Balık',
    SUT_URUNLERI: 'Süt Ürünleri',
    FIRIN_PASTANE: 'Fırın & Pastane',
    TEMEL_GIDA: 'Temel Gıda',
    ATISTIRMALIK: 'Atıştırmalık',
    ICECEK: 'İçecek',
    HAZIR_YEMEK: 'Hazır Yemek & Dondurulmuş',
    TEMIZLIK: 'Temizlik',
    KISISEL_BAKIM: 'Kişisel Bakım & Kozmetik',
    KAGIT_URUNLERI: 'Kağıt Ürünleri',
    ANNE_BEBEK: 'Anne & Bebek',
    EV_YASAM: 'Ev & Yaşam',
    ELEKTRONIK: 'Elektronik',
    EVCIL_HAYVAN: 'Evcil Hayvan',
    CICEK: 'Çiçek',
    DIGER: 'Diğer',
} as const;

export type AnaKategori = typeof ANA_KATEGORILER[keyof typeof ANA_KATEGORILER];

// ─── Kanonik Mapping Tablosu ─────────────────────────────────────────────────
// Format: 'market yaprak ismi (küçük harf, trim)' → { canonical, ana }
// Tüm üç marketten gelen yaprak isimler buraya eklenir.
// Aynı gerçek kategorinin farklı marketteki farklı isimleri aynı canonical'a düşer.

interface Mapping {
    canonical: string;      // Bizim gösterdiğimiz alt kategori adı
    ana: AnaKategori;       // 16 ana kategoriden biri
}

const RAW_MAP: Record<string, Mapping> = {

    // ── MEYVE & SEBZE ──────────────────────────────────────────────────────────
    'meyve': { canonical: 'Meyve', ana: ANA_KATEGORILER.MEYVE_SEBZE },
    'sebze': { canonical: 'Sebze', ana: ANA_KATEGORILER.MEYVE_SEBZE },
    'meyve & sebze': { canonical: 'Meyve & Sebze', ana: ANA_KATEGORILER.MEYVE_SEBZE },
    'meyve,sebze': { canonical: 'Meyve & Sebze', ana: ANA_KATEGORILER.MEYVE_SEBZE },
    'meyve sebze': { canonical: 'Meyve & Sebze', ana: ANA_KATEGORILER.MEYVE_SEBZE },
    'narenciye': { canonical: 'Narenciye', ana: ANA_KATEGORILER.MEYVE_SEBZE },
    'yeşillik': { canonical: 'Yeşillik & Otlar', ana: ANA_KATEGORILER.MEYVE_SEBZE },
    'yeşillikler ve otlar': { canonical: 'Yeşillik & Otlar', ana: ANA_KATEGORILER.MEYVE_SEBZE },
    'patates, soğan, sarımsak': { canonical: 'Patates, Soğan & Sarımsak', ana: ANA_KATEGORILER.MEYVE_SEBZE },
    'kabuklu sert meyveler': { canonical: 'Kabuklu Sert Meyveler', ana: ANA_KATEGORILER.MEYVE_SEBZE },
    'hurmalar': { canonical: 'Hurma', ana: ANA_KATEGORILER.MEYVE_SEBZE },
    'kurutulmuş  meyve ve sebze': { canonical: 'Kurutulmuş Meyve & Sebze', ana: ANA_KATEGORILER.MEYVE_SEBZE },
    'kurutulmuş meyve ve sebze': { canonical: 'Kurutulmuş Meyve & Sebze', ana: ANA_KATEGORILER.MEYVE_SEBZE },
    'mantar': { canonical: 'Mantar', ana: ANA_KATEGORILER.MEYVE_SEBZE },

    // ── ET, TAVUK & BALIK ──────────────────────────────────────────────────────
    'kırmızı et': { canonical: 'Kırmızı Et', ana: ANA_KATEGORILER.ET_TAVUK_BALIK },
    'beyaz et': { canonical: 'Tavuk & Beyaz Et', ana: ANA_KATEGORILER.ET_TAVUK_BALIK },
    'paketli beyaz et': { canonical: 'Tavuk & Beyaz Et', ana: ANA_KATEGORILER.ET_TAVUK_BALIK },
    'tavuk': { canonical: 'Tavuk & Beyaz Et', ana: ANA_KATEGORILER.ET_TAVUK_BALIK },
    'balık, deniz ürünleri': { canonical: 'Balık & Deniz Ürünleri', ana: ANA_KATEGORILER.ET_TAVUK_BALIK },
    'deniz ürünleri': { canonical: 'Balık & Deniz Ürünleri', ana: ANA_KATEGORILER.ET_TAVUK_BALIK },
    'balık konservesi': { canonical: 'Balık & Deniz Ürünleri', ana: ANA_KATEGORILER.ET_TAVUK_BALIK },
    'sucuk': { canonical: 'Sucuk', ana: ANA_KATEGORILER.ET_TAVUK_BALIK },
    'salam': { canonical: 'Salam & Jambon', ana: ANA_KATEGORILER.ET_TAVUK_BALIK },
    'sosis': { canonical: 'Sosis', ana: ANA_KATEGORILER.ET_TAVUK_BALIK },
    'pastırma': { canonical: 'Pastırma', ana: ANA_KATEGORILER.ET_TAVUK_BALIK },
    'kavurma': { canonical: 'Kavurma', ana: ANA_KATEGORILER.ET_TAVUK_BALIK },
    'jambon ürünleri': { canonical: 'Salam & Jambon', ana: ANA_KATEGORILER.ET_TAVUK_BALIK },
    'füme ürünler': { canonical: 'Füme Ürünler', ana: ANA_KATEGORILER.ET_TAVUK_BALIK },
    'şarküteri': { canonical: 'Şarküteri', ana: ANA_KATEGORILER.ET_TAVUK_BALIK },
    'et şarküteri': { canonical: 'Şarküteri', ana: ANA_KATEGORILER.ET_TAVUK_BALIK },
    'yumurta': { canonical: 'Yumurta', ana: ANA_KATEGORILER.ET_TAVUK_BALIK },

    // ── SÜT ÜRÜNLERİ ───────────────────────────────────────────────────────────
    'süt': { canonical: 'Süt', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'yoğurt': { canonical: 'Yoğurt', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'kaşar peyniri': { canonical: 'Kaşar Peyniri', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'kaşar peynir': { canonical: 'Kaşar Peyniri', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'kaşar': { canonical: 'Kaşar Peyniri', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'kaşarlar': { canonical: 'Kaşar Peyniri', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'beyaz peynir': { canonical: 'Beyaz Peynir', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'yöresel peynir': { canonical: 'Yöresel Peynir', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'krem peynir': { canonical: 'Krem Peynir', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'sürülebilir peynir': { canonical: 'Krem Peynir', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'süzme peynir': { canonical: 'Süzme Peynir', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'tereyağı': { canonical: 'Tereyağı', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'tereyağ': { canonical: 'Tereyağı', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'tereyağ, margarin': { canonical: 'Tereyağı', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'margarin': { canonical: 'Tereyağı', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'kaymak ve krema': { canonical: 'Kaymak & Krema', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'kaymak, krema': { canonical: 'Kaymak & Krema', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'ayran': { canonical: 'Ayran & Kefir', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'kefir': { canonical: 'Ayran & Kefir', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'tatlı ve puding': { canonical: 'Sütlü Tatlı & Puding', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'helva, tahin, pekmez': { canonical: 'Tahin, Pekmez & Helva', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'tahin, pekmez ve helva': { canonical: 'Tahin, Pekmez & Helva', ana: ANA_KATEGORILER.SUT_URUNLERI },

    // ── KAHVALTILIK (Süt Ürünleri altına alınıyor) ────────────────────────────
    'zeytin': { canonical: 'Zeytin', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'bal': { canonical: 'Bal & Reçel', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'reçel': { canonical: 'Bal & Reçel', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'bal, reçel': { canonical: 'Bal & Reçel', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'krem çikolata ve ezme': { canonical: 'Krem Çikolata & Ezme', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'sürülebilir ürünler': { canonical: 'Krem Çikolata & Ezme', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'kahvaltılık gevrek': { canonical: 'Kahvaltılık Gevrek', ana: ANA_KATEGORILER.SUT_URUNLERI },
    'kahvaltılık soslar': { canonical: 'Kahvaltılık Soslar', ana: ANA_KATEGORILER.SUT_URUNLERI },

    // ── FIRIN & PASTANE ────────────────────────────────────────────────────────
    'ekmek': { canonical: 'Ekmek', ana: ANA_KATEGORILER.FIRIN_PASTANE },
    'ekmek & pastane': { canonical: 'Fırın & Pastane', ana: ANA_KATEGORILER.FIRIN_PASTANE },
    'fırın, pastane': { canonical: 'Fırın & Pastane', ana: ANA_KATEGORILER.FIRIN_PASTANE },
    'unlu mamüller': { canonical: 'Unlu Mamüller', ana: ANA_KATEGORILER.FIRIN_PASTANE },
    'paketli ekmekler': { canonical: 'Paketli Ekmekler', ana: ANA_KATEGORILER.FIRIN_PASTANE },
    'katmer, lavaş ve bazlama': { canonical: 'Lavaş & Bazlama', ana: ANA_KATEGORILER.FIRIN_PASTANE },
    'kurabiye, kuruvasan, simit': { canonical: 'Simit & Kurabiye', ana: ANA_KATEGORILER.FIRIN_PASTANE },
    'tatlılar': { canonical: 'Pasta & Tatlı', ana: ANA_KATEGORILER.FIRIN_PASTANE },
    'pasta tatlı': { canonical: 'Pasta & Tatlı', ana: ANA_KATEGORILER.FIRIN_PASTANE },
    'fırından sıcak': { canonical: 'Fırından Sıcak', ana: ANA_KATEGORILER.FIRIN_PASTANE },

    // ── TEMEL GIDA ─────────────────────────────────────────────────────────────
    'salça': { canonical: 'Salça', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'salçalar': { canonical: 'Salça', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'sıvı yağlar': { canonical: 'Sıvı Yağ', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'sıvı yağ': { canonical: 'Sıvı Yağ', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'aycicek yagi': { canonical: 'Sıvı Yağ', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'ayçiçek yağı': { canonical: 'Sıvı Yağ', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'zeytinyağı': { canonical: 'Zeytinyağı', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'zeytinyağlar': { canonical: 'Zeytinyağı', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'makarna': { canonical: 'Makarna', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'makarna ve mantı': { canonical: 'Makarna & Mantı', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'makarna, noodle': { canonical: 'Makarna', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'erişte, mantı': { canonical: 'Makarna & Mantı', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'makarna sosları': { canonical: 'Makarna Sosu', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'pirinç': { canonical: 'Pirinç', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'pirinç ve bulgur': { canonical: 'Pirinç & Bulgur', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'baldo pirinç': { canonical: 'Pirinç', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'osmancık pirinç': { canonical: 'Pirinç', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'bakliyat': { canonical: 'Bakliyat', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'şeker': { canonical: 'Şeker', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'mutfak şeker': { canonical: 'Şeker', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'un': { canonical: 'Un', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'konserve': { canonical: 'Konserve', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'tuz, baharat': { canonical: 'Tuz & Baharat', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'tuz, baharat, harç': { canonical: 'Tuz & Baharat', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'harç': { canonical: 'Tuz & Baharat', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'ketçap': { canonical: 'Sos & Çeşni', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'mayonez': { canonical: 'Sos & Çeşni', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'ketçap, mayonez, soslar, sirkeler': { canonical: 'Sos & Çeşni', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'lezzetlendirici sos': { canonical: 'Sos & Çeşni', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'salata sosu': { canonical: 'Sos & Çeşni', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'soya ve diğer soslar': { canonical: 'Sos & Çeşni', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'hardal': { canonical: 'Sos & Çeşni', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'nar ekşisi': { canonical: 'Sos & Çeşni', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'limon suyu': { canonical: 'Sos & Çeşni', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'turşu': { canonical: 'Turşu', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'çorba': { canonical: 'Hazır Çorba', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'hazır çorbalar': { canonical: 'Hazır Çorba', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'bulyon': { canonical: 'Bulyon', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'bulyonlar': { canonical: 'Bulyon', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'hamur ve pasta malzemeleri': { canonical: 'Hamur & Pasta Malzemeleri', ana: ANA_KATEGORILER.TEMEL_GIDA },
    'hamur pasta malzemeleri': { canonical: 'Hamur & Pasta Malzemeleri', ana: ANA_KATEGORILER.TEMEL_GIDA },

    // ── ATIŞTIMALIK ────────────────────────────────────────────────────────────
    'çikolata': { canonical: 'Çikolata', ana: ANA_KATEGORILER.ATISTIRMALIK },
    'bisküvi': { canonical: 'Bisküvi & Kraker', ana: ANA_KATEGORILER.ATISTIRMALIK },
    'bisküvi, kraker': { canonical: 'Bisküvi & Kraker', ana: ANA_KATEGORILER.ATISTIRMALIK },
    'kraker ve tuzlu bisküvi': { canonical: 'Bisküvi & Kraker', ana: ANA_KATEGORILER.ATISTIRMALIK },
    'gofret': { canonical: 'Gofret', ana: ANA_KATEGORILER.ATISTIRMALIK },
    'kek': { canonical: 'Kek & Pasta', ana: ANA_KATEGORILER.ATISTIRMALIK },
    'cips': { canonical: 'Cips', ana: ANA_KATEGORILER.ATISTIRMALIK },
    'kuruyemiş': { canonical: 'Kuruyemiş', ana: ANA_KATEGORILER.ATISTIRMALIK },
    'kuruyemiş, kuru meyve': { canonical: 'Kuruyemiş', ana: ANA_KATEGORILER.ATISTIRMALIK },
    'şekerleme': { canonical: 'Şekerleme & Sakız', ana: ANA_KATEGORILER.ATISTIRMALIK },
    'sakız, şekerleme': { canonical: 'Şekerleme & Sakız', ana: ANA_KATEGORILER.ATISTIRMALIK },
    'sakız': { canonical: 'Şekerleme & Sakız', ana: ANA_KATEGORILER.ATISTIRMALIK },
    'draje': { canonical: 'Şekerleme & Sakız', ana: ANA_KATEGORILER.ATISTIRMALIK },
    'ikramlık ürünler': { canonical: 'Atıştırmalık Diğer', ana: ANA_KATEGORILER.ATISTIRMALIK },
    'light ürünler ve protein bar': { canonical: 'Protein Bar & Sağlıklı', ana: ANA_KATEGORILER.ATISTIRMALIK },
    'sağlıklı atıştırmalıklar': { canonical: 'Protein Bar & Sağlıklı', ana: ANA_KATEGORILER.ATISTIRMALIK },

    // ── İÇECEK ─────────────────────────────────────────────────────────────────
    'su': { canonical: 'Su', ana: ANA_KATEGORILER.ICECEK },
    'maden suyu': { canonical: 'Maden Suyu', ana: ANA_KATEGORILER.ICECEK },
    'çay': { canonical: 'Çay', ana: ANA_KATEGORILER.ICECEK },
    'kahve': { canonical: 'Kahve', ana: ANA_KATEGORILER.ICECEK },
    'bitki çayları': { canonical: 'Bitki Çayı', ana: ANA_KATEGORILER.ICECEK },
    'kola': { canonical: 'Gazlı İçecek', ana: ANA_KATEGORILER.ICECEK },
    'gazoz': { canonical: 'Gazlı İçecek', ana: ANA_KATEGORILER.ICECEK },
    'gazlı içecekler': { canonical: 'Gazlı İçecek', ana: ANA_KATEGORILER.ICECEK },
    'gazsız içecekler': { canonical: 'Meyve Suyu & Nektarlar', ana: ANA_KATEGORILER.ICECEK },
    'meyve suyu': { canonical: 'Meyve Suyu & Nektarlar', ana: ANA_KATEGORILER.ICECEK },
    'enerji içeceği': { canonical: 'Enerji İçeceği', ana: ANA_KATEGORILER.ICECEK },
    'soğuk çay': { canonical: 'Soğuk Çay & Kahve', ana: ANA_KATEGORILER.ICECEK },
    'soğuk kahve': { canonical: 'Soğuk Çay & Kahve', ana: ANA_KATEGORILER.ICECEK },
    'limonata, şalgam ve şerbet': { canonical: 'Limonata & Şalgam', ana: ANA_KATEGORILER.ICECEK },
    'boza ve malt içecekler': { canonical: 'Boza & Malt', ana: ANA_KATEGORILER.ICECEK },
    'fonksiyonel içecekler': { canonical: 'Fonksiyonel İçecek', ana: ANA_KATEGORILER.ICECEK },
    'soğuk toz içecekler': { canonical: 'Toz İçecek', ana: ANA_KATEGORILER.ICECEK },
    'ayran, kefir': { canonical: 'Ayran & Kefir', ana: ANA_KATEGORILER.ICECEK },

    // ── HAZIR YEMEK & DONDURULMUŞ ──────────────────────────────────────────────
    'dondurulmuş gıda': { canonical: 'Dondurulmuş Gıda', ana: ANA_KATEGORILER.HAZIR_YEMEK },
    'dondurulmuş ürünler': { canonical: 'Dondurulmuş Gıda', ana: ANA_KATEGORILER.HAZIR_YEMEK },
    'tekli ürünler': { canonical: 'Dondurma', ana: ANA_KATEGORILER.HAZIR_YEMEK },
    'kap ürünler': { canonical: 'Dondurma', ana: ANA_KATEGORILER.HAZIR_YEMEK },
    'pratik yemekler': { canonical: 'Hazır Yemek', ana: ANA_KATEGORILER.HAZIR_YEMEK },
    'hazır yemek ve meze': { canonical: 'Hazır Yemek & Meze', ana: ANA_KATEGORILER.HAZIR_YEMEK },
    'hazır yemek, donuk': { canonical: 'Hazır Yemek & Meze', ana: ANA_KATEGORILER.HAZIR_YEMEK },
    'meze': { canonical: 'Hazır Yemek & Meze', ana: ANA_KATEGORILER.HAZIR_YEMEK },
    'sandviç, dürümler': { canonical: 'Sandviç & Dürüm', ana: ANA_KATEGORILER.HAZIR_YEMEK },
    'dondurma': { canonical: 'Dondurma', ana: ANA_KATEGORILER.HAZIR_YEMEK },
    'dondurulmuş tatlı': { canonical: 'Dondurma', ana: ANA_KATEGORILER.HAZIR_YEMEK },
    'hazır tatlılar': { canonical: 'Hazır Tatlı', ana: ANA_KATEGORILER.HAZIR_YEMEK },
    'kuru tatlılar': { canonical: 'Hazır Tatlı', ana: ANA_KATEGORILER.HAZIR_YEMEK },

    // ── TEMİZLİK ───────────────────────────────────────────────────────────────
    'çamaşır': { canonical: 'Çamaşır Deterjanı', ana: ANA_KATEGORILER.TEMIZLIK },
    'toz deterjan': { canonical: 'Çamaşır Deterjanı', ana: ANA_KATEGORILER.TEMIZLIK },
    'sıvı deterjan': { canonical: 'Çamaşır Deterjanı', ana: ANA_KATEGORILER.TEMIZLIK },
    'çamaşır yumuşatıcıları': { canonical: 'Çamaşır Yumuşatıcı', ana: ANA_KATEGORILER.TEMIZLIK },
    'bulaşık': { canonical: 'Bulaşık Deterjanı', ana: ANA_KATEGORILER.TEMIZLIK },
    'bulaşık makinesi ürünleri': { canonical: 'Bulaşık Deterjanı', ana: ANA_KATEGORILER.TEMIZLIK },
    'genel temizlik': { canonical: 'Genel Temizlik', ana: ANA_KATEGORILER.TEMIZLIK },
    'haşere öldürücüler': { canonical: 'Böcek & Haşere', ana: ANA_KATEGORILER.TEMIZLIK },
    'temizlik malzemeleri': { canonical: 'Temizlik Malzemesi', ana: ANA_KATEGORILER.TEMIZLIK },
    'oda kokuları': { canonical: 'Oda Kokusu & Hava Spreyi', ana: ANA_KATEGORILER.TEMIZLIK },
    'çöp poşeti': { canonical: 'Çöp Poşeti', ana: ANA_KATEGORILER.TEMIZLIK },
    'çöp torbaları': { canonical: 'Çöp Poşeti', ana: ANA_KATEGORILER.TEMIZLIK },
    'cop torbalari': { canonical: 'Çöp Poşeti', ana: ANA_KATEGORILER.TEMIZLIK },

    // ── KİŞİSEL BAKIM & KOZMETİK ───────────────────────────────────────────────
    'şampuanlar': { canonical: 'Şampuan', ana: ANA_KATEGORILER.KISISEL_BAKIM },
    'saç bakım': { canonical: 'Saç Bakım', ana: ANA_KATEGORILER.KISISEL_BAKIM },
    'diş macunları': { canonical: 'Diş Macunu', ana: ANA_KATEGORILER.KISISEL_BAKIM },
    'ağız bakım ürünleri': { canonical: 'Ağız Bakımı', ana: ANA_KATEGORILER.KISISEL_BAKIM },
    'sıvı sabunlar': { canonical: 'Sıvı Sabun', ana: ANA_KATEGORILER.KISISEL_BAKIM },
    'duş, banyo, sabun': { canonical: 'Duş Jeli & Sabun', ana: ANA_KATEGORILER.KISISEL_BAKIM },
    'cilt bakımı': { canonical: 'Cilt Bakımı', ana: ANA_KATEGORILER.KISISEL_BAKIM },
    'parfüm, deodorant': { canonical: 'Deodorant & Parfüm', ana: ANA_KATEGORILER.KISISEL_BAKIM },
    'erkek bakım': { canonical: 'Erkek Bakım', ana: ANA_KATEGORILER.KISISEL_BAKIM },
    'makyaj': { canonical: 'Makyaj & Kozmetik', ana: ANA_KATEGORILER.KISISEL_BAKIM },
    'hijyenik ped': { canonical: 'Hijyenik Bakım', ana: ANA_KATEGORILER.KISISEL_BAKIM },
    'ağda epilasyon': { canonical: 'Epilasyon', ana: ANA_KATEGORILER.KISISEL_BAKIM },
    'kolonya': { canonical: 'Kolonya', ana: ANA_KATEGORILER.KISISEL_BAKIM },
    'güneş bakım': { canonical: 'Güneş Bakımı', ana: ANA_KATEGORILER.KISISEL_BAKIM },
    'sağlık ürünleri': { canonical: 'Sağlık & Eczane', ana: ANA_KATEGORILER.KISISEL_BAKIM },
    'kişisel bakım, kozmetik, sağlık': { canonical: 'Kişisel Bakım', ana: ANA_KATEGORILER.KISISEL_BAKIM },
    'kişisel bakım & kozmetik': { canonical: 'Kişisel Bakım', ana: ANA_KATEGORILER.KISISEL_BAKIM },

    // ── KAĞIT ÜRÜNLERİ ─────────────────────────────────────────────────────────
    'tuvalet kağıtları': { canonical: 'Tuvalet Kağıdı', ana: ANA_KATEGORILER.KAGIT_URUNLERI },
    'tuvalet kağıdı': { canonical: 'Tuvalet Kağıdı', ana: ANA_KATEGORILER.KAGIT_URUNLERI },
    'kağıt havlular': { canonical: 'Kağıt Havlu', ana: ANA_KATEGORILER.KAGIT_URUNLERI },
    'kağıt havlu': { canonical: 'Kağıt Havlu', ana: ANA_KATEGORILER.KAGIT_URUNLERI },
    'kağıt peçete, mendil': { canonical: 'Peçete & Mendil', ana: ANA_KATEGORILER.KAGIT_URUNLERI },
    'ıslak mendil': { canonical: 'Islak Mendil', ana: ANA_KATEGORILER.KAGIT_URUNLERI },
    'kağıt, ıslak mendil': { canonical: 'Kağıt & Mendil', ana: ANA_KATEGORILER.KAGIT_URUNLERI },
    'kağıt ürünleri': { canonical: 'Kağıt Ürünleri', ana: ANA_KATEGORILER.KAGIT_URUNLERI },

    // ── ANNE & BEBEK ───────────────────────────────────────────────────────────
    'bebek bezi': { canonical: 'Bebek Bezi', ana: ANA_KATEGORILER.ANNE_BEBEK },
    'bebek beslenme': { canonical: 'Bebek Maması', ana: ANA_KATEGORILER.ANNE_BEBEK },
    'bebek banyo': { canonical: 'Bebek Bakım', ana: ANA_KATEGORILER.ANNE_BEBEK },
    'ıslak havlu': { canonical: 'Bebek Islak Mendil', ana: ANA_KATEGORILER.ANNE_BEBEK },
    'anne - bebek & çocuk': { canonical: 'Anne & Bebek', ana: ANA_KATEGORILER.ANNE_BEBEK },

    // ── EV & YAŞAM ─────────────────────────────────────────────────────────────
    'mutfak gereçleri': { canonical: 'Mutfak Gereçleri', ana: ANA_KATEGORILER.EV_YASAM },
    'kullan at ürünler': { canonical: 'Tek Kullanımlık', ana: ANA_KATEGORILER.EV_YASAM },
    'ev gereçleri, dekorasyon': { canonical: 'Ev Gereçleri', ana: ANA_KATEGORILER.EV_YASAM },
    'giyim, aksesuar': { canonical: 'Giyim & Aksesuar', ana: ANA_KATEGORILER.EV_YASAM },
    'giyim & aksesuar': { canonical: 'Giyim & Aksesuar', ana: ANA_KATEGORILER.EV_YASAM },
    'spor hobi ürünleri': { canonical: 'Spor & Hobi', ana: ANA_KATEGORILER.EV_YASAM },
    'seyahat ürünleri': { canonical: 'Seyahat', ana: ANA_KATEGORILER.EV_YASAM },
    'bahçe malzemeleri': { canonical: 'Bahçe', ana: ANA_KATEGORILER.EV_YASAM },
    'nalburiye, hırdavat': { canonical: 'Nalburiye', ana: ANA_KATEGORILER.EV_YASAM },
    'oyuncak': { canonical: 'Oyuncak & Kırtasiye', ana: ANA_KATEGORILER.EV_YASAM },
    'kitap, kırtasiye': { canonical: 'Oyuncak & Kırtasiye', ana: ANA_KATEGORILER.EV_YASAM },
    'kitap, kırtasiye, oyuncak': { canonical: 'Oyuncak & Kırtasiye', ana: ANA_KATEGORILER.EV_YASAM },
    'oto ürünleri, aksesuarları': { canonical: 'Oto Aksesuar', ana: ANA_KATEGORILER.EV_YASAM },

    // ── ELEKTRONİK ─────────────────────────────────────────────────────────────
    'televizyon': { canonical: 'Televizyon', ana: ANA_KATEGORILER.ELEKTRONIK },
    'beyaz eşya': { canonical: 'Beyaz Eşya', ana: ANA_KATEGORILER.ELEKTRONIK },
    'telefon aksesuarları': { canonical: 'Telefon & Aksesuar', ana: ANA_KATEGORILER.ELEKTRONIK },
    'küçük elektrikli ev aletleri': { canonical: 'Küçük Ev Aletleri', ana: ANA_KATEGORILER.ELEKTRONIK },
    'elektrikli kişisel bakım': { canonical: 'Elektrikli Bakım Aleti', ana: ANA_KATEGORILER.ELEKTRONIK },
    'ısıtma, soğutma': { canonical: 'Isıtma & Soğutma', ana: ANA_KATEGORILER.ELEKTRONIK },
    'bilgisayar': { canonical: 'Bilgisayar', ana: ANA_KATEGORILER.ELEKTRONIK },
    'bilgisayar aksesuarları': { canonical: 'Bilgisayar Aksesuar', ana: ANA_KATEGORILER.ELEKTRONIK },
    'ses & görüntü sistemleri': { canonical: 'Ses & Görüntü', ana: ANA_KATEGORILER.ELEKTRONIK },
    'pil': { canonical: 'Pil & Şarj', ana: ANA_KATEGORILER.ELEKTRONIK },
    'kablo, priz, adaptör': { canonical: 'Kablo & Adaptör', ana: ANA_KATEGORILER.ELEKTRONIK },
    'ampul, aydınlatma': { canonical: 'Aydınlatma', ana: ANA_KATEGORILER.ELEKTRONIK },

    // ── EVCİL HAYVAN ───────────────────────────────────────────────────────────
    'evcil dostlar': { canonical: 'Evcil Hayvan', ana: ANA_KATEGORILER.EVCIL_HAYVAN },

    // ── ÇİÇEK ──────────────────────────────────────────────────────────────────
    'çiçek': { canonical: 'Çiçek', ana: ANA_KATEGORILER.CICEK },
};

// ─── Ana Fonksiyon ───────────────────────────────────────────────────────────
export interface CategoryResult {
    ana: AnaKategori;
    canonical: string;
    tags: string[];
}

export function getMappedCategory(
    marketLeafName: string,
    productName: string = ''
): CategoryResult {
    // Türkçe İ -> i eşleşmesi için (JavaScript toLowerCase() İ'yi i̇ yapıyor, RAW_MAP'teki key ile uyuşmuyor)
    const key = marketLeafName.trim().toLocaleLowerCase('tr-TR');
    const mapping = RAW_MAP[key];

    const ana = mapping?.ana ?? ANA_KATEGORILER.DIGER;
    const canonical = mapping?.canonical ?? marketLeafName.trim();
    const tags = extractTags(canonical, productName);

    return { ana, canonical, tags };
}

// ─── Otomatik Tag Çıkarımı ───────────────────────────────────────────────────
function extractTags(canonical: string, productName: string): string[] {
    const tags: string[] = [];
    const combined = `${canonical} ${productName}`.toLowerCase();

    // Süt
    if (combined.includes('tam yağlı')) tags.push('Tam Yağlı');
    if (combined.includes('yarım yağlı')) tags.push('Yarım Yağlı');
    if (combined.includes('yağsız') || combined.includes('light')) tags.push('Yağsız / Light');
    if (combined.includes('laktozsuz')) tags.push('Laktozsuz');
    if (combined.includes('uht')) tags.push('UHT');
    if (combined.includes('günlük')) tags.push('Günlük');
    if (combined.includes('organik') || combined.includes('organig')) tags.push('Organik');
    if (combined.includes('keçi')) tags.push('Keçi Sütü');
    if (combined.includes('probiyotik')) tags.push('Probiyotik');

    // Yoğurt
    if (combined.includes('süzme')) tags.push('Süzme');
    if (combined.includes('kaymaklı')) tags.push('Kaymaklı');
    if (combined.includes('tava')) tags.push('Tava');

    // Salça
    if (combined.includes('domates')) tags.push('Domates');
    if (combined.includes('biber')) tags.push('Biber');
    if (combined.includes('acı')) tags.push('Acı');
    if (combined.includes('tatlı')) tags.push('Tatlı');

    // Peynir
    if (combined.includes('dilimli')) tags.push('Dilimli');
    if (combined.includes('tost')) tags.push('Tost Peyniri');
    if (combined.includes('taze')) tags.push('Taze');
    if (combined.includes('kaşar')) tags.push('Kaşar');
    if (combined.includes('beyaz peynir')) tags.push('Beyaz Peynir');

    // Zeytinyağı
    if (combined.includes('sızma')) tags.push('Sızma');
    if (combined.includes('riviera')) tags.push('Riviera');
    if (combined.includes('natürel')) tags.push('Natürel');

    // Pirinç
    if (combined.includes('baldo')) tags.push('Baldo');
    if (combined.includes('osmancık')) tags.push('Osmancık');
    if (combined.includes('basmati')) tags.push('Basmati');

    // Deterjan
    if (combined.includes('toz')) tags.push('Toz');
    if (/\bsıvı\b/.test(combined) || combined.includes('jel')) tags.push('Sıvı / Jel');
    if (combined.includes('tablet')) tags.push('Tablet');
    if (combined.includes('beyazlar')) tags.push('Beyazlar İçin');
    if (combined.includes('renkliler')) tags.push('Renkliler İçin');
    if (combined.includes('konsantre')) tags.push('Konsantre');

    // Kağıt ürünleri
    if (combined.includes('3 katlı') || combined.includes('3 kat')) tags.push('3 Katlı');
    if (combined.includes('2 katlı') || combined.includes('2 kat')) tags.push('2 Katlı');
    if (combined.includes('dev rulo')) tags.push('Dev Rulo');
    if (combined.includes('parfümlü')) tags.push('Parfümlü');

    // Reçel / Bal
    const meyveler = ['çilek', 'vişne', 'kayısı', 'incir', 'gül', 'ahududu', 'portakal', 'böğürtlen', 'karpuz', 'elma', 'armut', 'mango'];
    meyveler.forEach(m => { if (combined.includes(m)) tags.push(m.charAt(0).toUpperCase() + m.slice(1)); });

    // Şekersiz
    if (combined.includes('şekersiz')) tags.push('Şekersiz');
    if (combined.includes('az tuzlu')) tags.push('Az Tuzlu');

    // Zeytin
    if (combined.includes('siyah')) tags.push('Siyah Zeytin');
    if (combined.includes('yeşil')) tags.push('Yeşil Zeytin');

    // Ekmek
    if (combined.includes('tam buğday') || combined.includes('kepek')) tags.push('Tam Buğday');
    if (combined.includes('çavdar')) tags.push('Çavdar');

    // Et
    if (combined.includes('dana')) tags.push('Dana');
    if (combined.includes('kuzu')) tags.push('Kuzu');
    if (combined.includes('kıyma')) tags.push('Kıyma');
    if (combined.includes('pirzola')) tags.push('Pirzola');

    return Array.from(new Set(tags));
}
