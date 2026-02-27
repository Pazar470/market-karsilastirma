
import { MarketAdapter } from './market-adapter';

export const A101Adapter: MarketAdapter = {
    marketId: 'a101',

    isActive(product: any): boolean {
        // logic from our scraper:
        // if Regüler or GrupSpot -> active
        // if KasaAktivitesi -> inactive (optional logic)
        return true;
    },

    mapCategory(marketCategory: string, productName: string = ''): string | null {
        const cat = marketCategory.trim();
        const lowerName = productName.toLowerCase();

        // 1. Exact Category Matches
        const exactMap: Record<string, string> = {
            'Meyve & Sebze': 'meyve-sebze',
            'Et & Tavuk & Şarküteri': 'et-tavuk-sarkuteri',
            'Süt & Kahvaltılık': 'sut-kahvaltilik',
            'Fırın & Pastane': 'firin-pastane',
            'Temel Gıda': 'temel-gida',
            'Atıştırmalık': 'atistirmalik',
            'Su & İçecek': 'icecek',
            'Dondurulmuş Ürünler': 'dondurulmus-urunler',
            'Hazır Yemek & Meze': 'dondurulmus-urunler', // Logic: merge
            'Temizlik': 'temizlik',
            'Kişisel Bakım': 'kisisel-bakim',
            'Kağıt Ürünleri': 'kagit-urunleri',
            'Elektronik': 'elektronik',
            'Anne & Bebek': 'bebek',
            'Ev & Yaşam': 'ev-yasam',
            'Tatlı': 'atistirmalik', // Merge for now, or new cat
            'Evcil Hayvan': 'evcil-hayvan' // New
        };

        if (exactMap[cat]) {
            let mapped = exactMap[cat];

            // 2. Keyword Refinement (Sub-category logic)
            // This Logic was extracted from map-categories.ts
            if (mapped === 'temel-gida') {
                if (lowerName.includes('yağ') || lowerName.includes('yag')) return 'sivi-yag';
                if (lowerName.includes('şeker') || lowerName.includes('seker')) return 'seker-tuz-baharat';
                if (lowerName.includes('çay') || lowerName.includes('cay') || lowerName.includes('kahve')) return 'cay-kahve';
                if (lowerName.includes('un ') || lowerName.includes('maya')) return 'un-pastane-malzemeleri';
                if (lowerName.includes('makarna') || lowerName.includes('pirinç') || lowerName.includes('mercimek')) return 'bakliyat';
            }

            if (mapped === 'sut-kahvaltilik') {
                if (lowerName.includes('yumurta')) return 'yumurta';
                if (lowerName.includes('peynir') || lowerName.includes('kaşar')) return 'peynir';
                if (lowerName.includes('süt') && !lowerName.includes('hazır süt')) return 'sut';
                if (lowerName.includes('tereyağ') || lowerName.includes('margarin')) return 'tereyag-margarin';
                if (lowerName.includes('yoğurt')) return 'yogurt';
                if (lowerName.includes('zeytin')) return 'zeytin';
            }

            return mapped;
        }

        return null; // Unmapped
    }
};
