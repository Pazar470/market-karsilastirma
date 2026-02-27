
/**
 * Market bazlı kategori isimlerini uygulamamızın standart "Master" kategorilerine eşler.
 */



export const MASTER_CATEGORIES = {
    // Gıda
    KASAR_PEYNIRI: 'Kaşar Peyniri',
    SALCA: 'Salça',
    SUT: 'Süt',
    YUMURTA: 'Yumurta',
    ZEYTINYAGI: 'Zeytinyağı',
    TEREYAGI: 'Tereyağı',
    AYCICEK_YAGI: 'Ayçiçek Yağı',
    MAKARNA: 'Makarna',
    PIRINC: 'Pirinç',
    BAKLIYAT: 'Bakliyat',
    YOGURT: 'Yoğurt',

    // Temizlik
    CAMASIR_DETERJANI: 'Çamaşır Deterjanı',
    BULASIK_DETERJANI: 'Bulaşık Deterjanı',
    KAGIT_HAVLU: 'Kağıt Havlu',
    TUVALET_KAGIDI: 'Tuvalet Kağıdı',
    YUMUSATICI: 'Çamaşır Yumuşatıcı',

    // Kişisel Bakım
    // Kişisel Bakım
    SAMPUAN: 'Şampuan',
    DIS_MACUNU: 'Diş Macunu',
    SIVI_SABUN: 'Sıvı Sabun',
    DUS_JELI: 'Duş Jeli',

    // Ev Bakım
    COP_POSETI: 'Çöp Poşeti',

    // Gıda - Kahvaltılık
    RECEL: 'Reçel'
} as const;

export type MasterCategoryType = typeof MASTER_CATEGORIES[keyof typeof MASTER_CATEGORIES];

export interface MappedCategory {
    master: string;
    tags: string[];
}

interface MarketMapping {
    [marketCategory: string]: {
        master: MasterCategoryType;
        autoTags: string[];
    };
}

export const CATEGORY_MAP: Record<string, MarketMapping> = {
    MIGROS: {
        // Gıda
        'kasar-peyniri-c-40d': { master: MASTER_CATEGORIES.KASAR_PEYNIRI, autoTags: [] },
        'salca-c-124': { master: MASTER_CATEGORIES.SALCA, autoTags: [] },
        'icme-sutu-c-3eba': { master: MASTER_CATEGORIES.SUT, autoTags: [] },
        'yumurta-c-415': { master: MASTER_CATEGORIES.YUMURTA, autoTags: [] },
        'tereyagi-c-413': { master: MASTER_CATEGORIES.TEREYAGI, autoTags: [] },
        'yogurt-c-40e': { master: MASTER_CATEGORIES.YOGURT, autoTags: [] },
        'aycicek-yagi-c-122e': { master: MASTER_CATEGORIES.AYCICEK_YAGI, autoTags: [] },
        'sizma-zeytinya-c-2790': { master: MASTER_CATEGORIES.ZEYTINYAGI, autoTags: ['Sızma'] },
        'riveria-zeytinya-c-2791': { master: MASTER_CATEGORIES.ZEYTINYAGI, autoTags: ['Riviera'] },
        'makarnalar-c-11f': { master: MASTER_CATEGORIES.MAKARNA, autoTags: [] },
        'baldo-pirinc-c-2788': { master: MASTER_CATEGORIES.PIRINC, autoTags: ['Baldo'] },
        'osmancik-pirinc-c-2789': { master: MASTER_CATEGORIES.PIRINC, autoTags: ['Osmancık'] },
        'bakliyat-c-11e': { master: MASTER_CATEGORIES.BAKLIYAT, autoTags: [] },
        // Temizlik & Bakım
        'toz-deterjan-c-497': { master: MASTER_CATEGORIES.CAMASIR_DETERJANI, autoTags: ['Toz'] },
        'sivi-deterjan-c-498': { master: MASTER_CATEGORIES.CAMASIR_DETERJANI, autoTags: ['Sıvı'] },
        'bulasik-makinesi-urunleri-c-491': { master: MASTER_CATEGORIES.BULASIK_DETERJANI, autoTags: [] },
        'sampuanlar-c-43f': { master: MASTER_CATEGORIES.SAMPUAN, autoTags: [] },
        'dis-macunlari-c-44c': { master: MASTER_CATEGORIES.DIS_MACUNU, autoTags: [] },
        'kagit-havlular-c-4a3': { master: MASTER_CATEGORIES.KAGIT_HAVLU, autoTags: [] },
        'tuvalet-kagitlari-c-4a2': { master: MASTER_CATEGORIES.TUVALET_KAGIDI, autoTags: [] },
        'sivi-sabunlar-c-448': { master: MASTER_CATEGORIES.SIVI_SABUN, autoTags: [] },
        'camasir-yumusaticilar-c-49a': { master: MASTER_CATEGORIES.YUMUSATICI, autoTags: [] },
        'cop-torbalari-c-49e': { master: MASTER_CATEGORIES.COP_POSETI, autoTags: [] },
        'receller-c-11b': { master: MASTER_CATEGORIES.RECEL, autoTags: [] },
    },
    A101: {
        'C0512': { master: MASTER_CATEGORIES.KASAR_PEYNIRI, autoTags: [] },
        'salca': { master: MASTER_CATEGORIES.SALCA, autoTags: [] },
        'sut': { master: MASTER_CATEGORIES.SUT, autoTags: [] },
        'yumurta': { master: MASTER_CATEGORIES.YUMURTA, autoTags: [] },
        'tereyagi': { master: MASTER_CATEGORIES.TEREYAGI, autoTags: [] },
        'yogurt': { master: MASTER_CATEGORIES.YOGURT, autoTags: [] },
        'aycicek-yagi': { master: MASTER_CATEGORIES.AYCICEK_YAGI, autoTags: [] },
        'zeytinyagi': { master: MASTER_CATEGORIES.ZEYTINYAGI, autoTags: [] },
        'makarna': { master: MASTER_CATEGORIES.MAKARNA, autoTags: [] },
        'pirinc': { master: MASTER_CATEGORIES.PIRINC, autoTags: [] },
        'bakliyat': { master: MASTER_CATEGORIES.BAKLIYAT, autoTags: [] },
        'C1303': { master: MASTER_CATEGORIES.KAGIT_HAVLU, autoTags: [] },
        'C1302': { master: MASTER_CATEGORIES.TUVALET_KAGIDI, autoTags: [] },
        'C1203': { master: MASTER_CATEGORIES.SIVI_SABUN, autoTags: [] },
        'C1106': { master: MASTER_CATEGORIES.COP_POSETI, autoTags: [] },
    },
    SOK: {
        'kasar-peynir-c-520': { master: MASTER_CATEGORIES.KASAR_PEYNIRI, autoTags: [] },
        'salcalar-c-606': { master: MASTER_CATEGORIES.SALCA, autoTags: [] },
        'sut-c-512': { master: MASTER_CATEGORIES.SUT, autoTags: [] },
        'yumurta-c-518': { master: MASTER_CATEGORIES.YUMURTA, autoTags: [] },
        'tereyagi-c-524': { master: MASTER_CATEGORIES.TEREYAGI, autoTags: [] },
        'yogurt-c-514': { master: MASTER_CATEGORIES.YOGURT, autoTags: [] },
        'aycicek-yaglar-c-1773': { master: MASTER_CATEGORIES.AYCICEK_YAGI, autoTags: [] },
        'zeytinyaglar-c-1772': { master: MASTER_CATEGORIES.ZEYTINYAGI, autoTags: [] },
        'makarnalar-c-1779': { master: MASTER_CATEGORIES.MAKARNA, autoTags: [] },
        'kagit-urunleri-c-20875': { master: MASTER_CATEGORIES.KAGIT_HAVLU, autoTags: [] },
        'cop-torbalari-c-20794': { master: MASTER_CATEGORIES.COP_POSETI, autoTags: [] },
    }
};

/**
 * Verilen market ve market kategorisi için standart kategori ismini ve etiketleri döner.
 */
export function getMappedCategory(market: string, marketCategoryCode: string, marketCategoryName: string, productName: string = ''): MappedCategory {
    const marketKey = market.toUpperCase();
    const mapping = CATEGORY_MAP[marketKey]?.[marketCategoryCode];

    const result: MappedCategory = {
        master: mapping?.master || marketCategoryName, // FALLBACK: If not in map, use market's leaf name
        tags: [...(mapping?.autoTags || [])]
    };

    // Akıllı Etiketleme (İsimlerden özellik cımbızla çekme)
    const lowerCat = marketCategoryName.toLowerCase();
    const lowerProduct = productName.toLowerCase();
    const combined = `${lowerCat} ${lowerProduct}`;

    // Peynir Özellikleri
    if (combined.includes('tost')) result.tags.push('Tost Peyniri');
    if (combined.includes('taze')) result.tags.push('Taze');
    if (combined.includes('eski')) result.tags.push('Eski');
    if (combined.includes('klasik')) result.tags.push('Klasik');
    if (combined.includes('süzme')) result.tags.push('Süzme');

    // Salça Özellikleri
    if (combined.includes('biber')) result.tags.push('Biber');
    if (combined.includes('domates')) result.tags.push('Domates');
    if (combined.includes('acı')) result.tags.push('Acı');
    if (combined.includes('tatlı')) result.tags.push('Tatlı');

    // Süt ve Süt Ürünleri Özellikleri
    if (combined.includes('günlük')) result.tags.push('Günlük');
    if (combined.includes('uht')) result.tags.push('UHT');
    if (combined.includes('laktozsuz')) result.tags.push('Laktozsuz');

    // Yağ Oranı Özellikleri
    if (combined.includes('tam yağlı')) result.tags.push('Tam Yağlı');
    if (combined.includes('yarım yağlı')) result.tags.push('Yarım Yağlı');
    if (combined.includes('az yağlı') || combined.includes('yağsız') || combined.includes('light')) result.tags.push('Yağsız/Az Yağlı');

    // Deterjan Özellikleri
    if (combined.includes('toz')) result.tags.push('Toz');
    // Kovası ISTISNA: Çöp Kovası 'Sıvı' tagi almasın
    if ((/\bsıvı\b/i.test(combined) || combined.includes('jel')) && !combined.includes('kovası')) {
        result.tags.push('Sıvı/Jel');
    }
    if (combined.includes('tablet')) result.tags.push('Tablet');
    if (combined.includes('beyazlar')) result.tags.push('Beyazlar İçin');
    if (combined.includes('renkliler')) result.tags.push('Renkliler İçin');

    // Kağıt Ürünleri
    if (combined.includes('3 katlı') || combined.includes('3 kat')) result.tags.push('3 Katlı');
    if (combined.includes('2 katlı') || combined.includes('2 kat')) result.tags.push('2 Katlı');
    if (combined.includes('dev rulo')) result.tags.push('Dev Rulo');
    if (combined.includes('parfümlü')) result.tags.push('Parfümlü');

    // Kişisel Bakım
    if (combined.includes('kepeğe karşı')) result.tags.push('Kepeğe Karşı');
    if (combined.includes('beyazlatıcı')) result.tags.push('Beyazlatıcı');
    if (combined.includes('hassas')) result.tags.push('Hassas');

    // Çöp Poşeti Özellikleri (İşlevsel: Boyut ve Adet Önemli)
    if (combined.includes('çöp poşeti') || combined.includes('çöp torbası')) {
        if (combined.includes('jumbo')) result.tags.push('Jumbo');
        if (combined.includes('büyük')) result.tags.push('Büyük');
        if (combined.includes('orta')) result.tags.push('Orta');
        if (combined.includes('küçük')) result.tags.push('Küçük');
        if (combined.includes('mini')) result.tags.push('Mini');

        // Adet yakalama (Örn: 20'li, 50 Adet)
        const adetMatch = combined.match(/(\d+)\s*(['"]?li|'lu|lu|lü|lı|adet|tane)\b/i);
        if (adetMatch) {
            result.tags.push(`${adetMatch[1]}'li`);
        }
    }

    // Reçel Özellikleri (İşlevsel: Çeşit Önemli)
    if (result.master === MASTER_CATEGORIES.RECEL || combined.includes('reçel')) {
        const fruitTypes = ['çilek', 'vişne', 'incir', 'gül', 'kayısı', 'ahududu', 'portakal', 'böğürtlen'];
        fruitTypes.forEach(fruit => {
            if (combined.includes(fruit)) result.tags.push(fruit.charAt(0).toUpperCase() + fruit.slice(1));
        });
        if (combined.includes('şekersiz')) result.tags.push('Şekersiz');
    }

    // Duplicate temizliği
    result.tags = Array.from(new Set(result.tags));

    return result;
}
