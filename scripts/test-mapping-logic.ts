
// Standalone logic tester
function predictCategory(name: string): string | null {
    const lower = name.toLowerCase();

    // 1. Specific Exclusions (High Priority)
    if (lower.includes('mendil') || lower.includes('havlu') || lower.includes('bez') || lower.includes('pamuk')) return 'islak-mendil';
    if (lower.includes('kağıt') || lower.includes('peçete')) return 'kagit-urunleri';
    if (lower.includes('deterjan') || lower.includes('yumuşatıcı') || lower.includes('suyu') && lower.includes('çamaşır')) return 'temizlik';
    if (lower.includes('şampuan') || lower.includes('sabun') || lower.includes('duş jeli')) return 'vucut-cilt-bakim';

    // 2. Specific Dairy (Before Generic Milk)
    // Cheese Granularity
    if (lower.includes('kaşar') || lower.includes('tost') || lower.includes('dilimli')) return 'kasar-peyniri';
    if (lower.includes('beyaz peynir') || lower.includes('süzme') || lower.includes('tam yağlı peynir') || lower.includes('inek peyniri')) return 'beyaz-peynir';
    if (lower.includes('labne') || lower.includes('krem') || lower.includes('tulum') || lower.includes('lor')) return 'diger-peynir';
    if (lower.includes('peynir')) return 'beyaz-peynir'; // Default fallback

    if (lower.includes('yoğurt') || lower.includes('yogurt')) return 'yogurt';
    if (lower.includes('ayran') || lower.includes('kefir')) return 'ayran-kefir';
    if (lower.includes('tereyağ') || lower.includes('margarin')) return 'tereyagi-margarin';
    if (lower.includes('kaymak') || lower.includes('krema')) return 'sut-kahvaltilik';
    if (lower.includes('yumurta')) return 'yumurta';

    // Generic Milk (Low Priority, with exclusions for brands like 'Teksüt', 'Sütaş' etc if they produce other things)
    // Checking previous rules protects against 'Sütaş Ayran', but 'Teksüt' brand alone might still match if just 'Teksüt'. 
    // Usually product name is 'Teksüt Süt'.
    if (lower.includes('süt') && !lower.includes('tatlı') && !lower.includes('kakao') && !lower.includes('bisküvi')) return 'sut';

    // Meat
    if (lower.includes('dana') || lower.includes('kuzu') || lower.includes('kıyma') || lower.includes('biftek') || lower.includes('köfte')) return 'kirmizi-et';
    if (lower.includes('tavuk') || lower.includes('piliç') || lower.includes('kanat') || lower.includes('but') || lower.includes('baget')) return 'tavuk';
    if (lower.includes('balık') || lower.includes('somon') || lower.includes('ton')) return 'balik-deniz-mahsulleri';
    if (lower.includes('sucuk') || lower.includes('salam') || lower.includes('sosis') || lower.includes('pastırma')) return 'sarkuteri';

    // Oil Granularity
    if (lower.includes('ayçiçek') || lower.includes('aycicek')) return 'aycicek-yagi';
    if (lower.includes('zeytinyağ') || lower.includes('riviera') || lower.includes('sizma')) return 'zeytinyagi';
    if (lower.includes('mısır özü') || lower.includes('kanola') || (lower.includes('yağ') && lower.includes('kızartma'))) return 'diger-yaglar';
    // Fallback for generic oil (only if it doesn't match above)
    if (lower.includes('sıvı yağ') || (lower.includes('yağ') && (lower.includes('litre') || lower.includes('pet')))) return 'aycicek-yagi';

    // Produce
    if (lower.includes('meyve') && !lower.includes('suyu') && !lower.includes('yoğurt') && !lower.includes('kek')) return 'meyve'; // Split?
    if (lower.includes('sebze') || lower.includes('patates') || lower.includes('soğan') || lower.includes('domates') || lower.includes('biber') || lower.includes('salatalık')) return 'sebze';

    // Bakery
    if (lower.includes('ekmek') || lower.includes('lavaş') || lower.includes('bazlama')) return 'ekmek';
    if (lower.includes('un') && !lower.includes('kurabiye') && !lower.includes('kek') && !lower.includes('gofret')) return 'un-pastane-malzemeleri';

    // Pantry
    if (lower.includes('makarna') || lower.includes('erişte') || lower.includes('noodle') || lower.includes('mantı')) return 'makarna';
    if (lower.includes('pirinç') || lower.includes('bulgur') || lower.includes('mercimek') || lower.includes('nohut') || lower.includes('fasulye')) return 'bakliyat';

    // Beverages
    if (lower.includes('çay') && !lower.includes('bisküvi')) return 'cay'; // 'Çaylı Bisküvi' risk
    if (lower.includes('kahve')) return 'kahve';
    if (lower.includes('su') && (lower.includes('maden') || lower.includes('doğal'))) return 'su-maden-suyu';
    if (lower.includes('kola') || lower.includes('gazoz') || lower.includes('soğuk çay') || lower.includes('ice tea')) return 'gazli-icecekler';
    if (lower.includes('meyve suyu') || lower.includes('nektar')) return 'meyve-suyu';

    // Snacks
    if (lower.includes('çikolata') || lower.includes('gofret') || lower.includes('bar')) return 'cikolata-gofret';
    if (lower.includes('bisküvi') || lower.includes('kek') || lower.includes('kurabiye')) return 'biskuvi-kek';
    if (lower.includes('cips') || lower.includes('kuruyemiş') || lower.includes('fıstık') || lower.includes('badem')) return 'cips-cerez';

    return null;
}

const testCases = [
    "Sleepy Zeytinyağlı Islak Havlu",
    "Abalı Ayçiçek Yağı 5 L",
    "Komili Riviera Zeytinyağı",
    "Altınkılıç Kaşar Peyniri",
    "Teksüt Beyaz Peynir",
    "Migros Keçe", // Should be null or something else
    "Uni Baby Islak Havlu",
    "Yudum Kızartma Ustası"
];

testCases.forEach(name => {
    console.log(`"${name}" -> ${predictCategory(name)}`);
});
