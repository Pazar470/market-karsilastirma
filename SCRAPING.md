# Market Tarama Yöntemleri (Üç Market)

Bu dosya, Migros / A101 / Şok için **başarılı tarama** yapılmış yöntemleri ve ilgili kod konumlarını özetler. "İkili" veya başka bir özel .md daha önce yazılmış olsa bile bulunamadı; bilgiler kod ve script’lerden çıkarıldı.

---

## 1. Migros

### Nasıl taranıyor?
- **API:** REST JSON. Sayfa bazlı.
- **Endpoint:** `GET https://www.migros.com.tr/rest/search/screens/{prettyName}?page={page}`
- **Kategori kaynağı:** `migros_categories.json` (her kategoride `prettyName`, `name`, `path`).
- **Ürünler:** `json.data?.storeProductInfos` veya `json.data?.searchInfo?.storeProductInfos`.
- **Fiyat:** `(item.shownPrice || item.regularPrice) / 100` (kuruş → TL).
- **Link:** `https://www.migros.com.tr/${item.prettyName}`.

### Başarılı kullanım
- **monitored-scrape.ts:** `scrapeMigros(cat.prettyName, cat.name, cat.path, market)` — tüm sayfalar (`for (;;)` ile, ürün bitene kadar).
- **lib/scraper.ts:** `scrapeMigros(cat, market)` — aynı endpoint, `cat.prettyName` kullanır.
- **lib/scraper/migros-api.ts:** `getProductsByCategory(leaf)` — `leaf.prettyName` ile sayfa sayfa (MAX_PAGES=50).

### Limit / hata
- Sayfa boş gelince döngü biter. Hata olunca `state.errors++` (Migros’taki 120 hata büyük ihtimalle buradan).

---

## 2. Şok

### Nasıl taranıyor?
- **Yöntem:** HTML sayfa + Cheerio (SSR sayfa).
- **URL formatı:** `https://www.sokmarket.com.tr/{slug}-c-{categoryId}`  
  Örn: `https://www.sokmarket.com.tr/mutfak-seker-c-1790`  
  Slug = kategori adından türetilir (Türkçe karakterler ASCII, boşluk `-`).
- **Kategori kaynağı:** `sok_categories.json` (her kategoride `id`, `name`, `path`; bazen hatalı `url` — slash eksik).
- **Ürün listesi:** `div[class*="PLPProductListing_PLPCardsWrapper"] a[href*="-p-"]`.
- **Fiyat:** Metin içinden regex: `(\d{1,3}(?:[.]\d{3})*(?:,\d{1,2})?)\s*(?:₺|TL)`.

### Başarılı kullanım
- **monitored-scrape.ts:** `scrapeSok(cat.id, cat.name, cat.path, market)` — URL’i `sokSlug(categoryName) + '-c-' + code` ile kurar (slug düzeltmesi burada yapıldı).
- **lib/scraper.ts:** `scrapeSok(cat, market)` — aynı slug mantığı `sokCategorySlug(cat.name)` ile.
- **lib/scraper/sok.ts:** Kendi kategorileri (`CATEGORIES`) ve keşif mantığı; `a[href*="-c-"]` ile alt kategorileri bulur, sonra her URL’i sayfa sayfa tarar.

### Önemli
- Eski hata: URL’de `sokmarket.com.tr` ile path arasında `/` yoktu; artık `/{slug}-c-{id}` kullanılıyor.

---

## 3. A101

### Nasıl taranıyor?
- **API:** REST JSON (Kapıda ekranından kullanılan API).
- **Endpoint:** `GET https://rio.a101.com.tr/dbmk89vnr/CALL/Store/getProductsByCategory/{storeId}?id={categoryId}&channel=SLOT&__culture=tr-TR&__platform=web&data=e30%3D&__isbase64=true`
- **storeId:** `VS032` (sabit).
- **Header:** `Origin: https://www.a101.com.tr`, `Referer: https://www.a101.com.tr/kapida` (Kapıda sayfası).
- **Ürünler:** `data.data` (dizi) ve/veya `data.children[].products` (dizi).

### Başarılı kullanım (lib/scraper/a101.ts)
- **Kategori ID’leri:** **Üst (parent) ID’ler:** `C01`, `C04`, `C05`, `C02`, `C07`, … (C05 = Süt & Kahvaltılık vb.).
- **Filtre:** Sadece `item.attributes?.nitelikAdi === 'Regüler'` veya `'GrupSpot'` olan ürünler alınıyor; `KasaAktivitesi` vb. atılıyor.
- **Fiyat:** `item.price.discounted` veya `item.price.normal`, 100’e bölünür.
- **Link:** `https://www.a101.com.tr/kapida/u/${item.url || item.slug || item.id}`.

### monitored-scrape / lib/scraper.ts (güncel)
- A101 için **parent ID + yaprak filtre** kullanılıyor: **a101_categories.json** yaprak ID’leri (C0101, C0512 …) parent’a göre gruplanır; API’ye **parent** ID ile istek atılır; gelen ürünler `product.categories` ile yaprak eşleşenler filtrelenir. Böylece A101’den ürün gelir.
- Kategorilendirme (ana + yaprak + tag) **docs/KATEGORIZASYON-MODELI.md** ve **lib/category-mapper.ts** ile yapılır.

### Tek yaprak kategori testi (Kaşar Peyniri)
- **Kategori yolu (foto):** Anasayfa > Kapıda > Süt Ürünleri, Kahvaltılık > Kaşar Peyniri — URL: `a101.com.tr/kapida/sut-urunleri-kahvaltilik/kasar-peyniri`
- **Çalışan mantık:** API'ye **parent** ID ile istek at (`C05`); gelen ürünlerden `product.categories` içinde yaprak ID (`C0512` = Kaşar Peyniri) olanları filtrele.
- **Test:** `scripts/test-a101-leaf-kasar.ts` — C05 + C0512 filtre → 39 ürün. Aynı mantık: `scripts/fetch-a101-kasar.ts` (DB upsert + zombi kuralı).

### Öneri (A101 monitored-scrape için)
1. **Parent ID kullan:** a101_categories.json'daki yaprak ID'lerini doğrudan API'ye verme; her yaprak için parent bul (C0512 → C05), API'ye parent ile istek at, yanıtta `categories` ile yaprak eşleşen ürünleri filtrele.
2. **nitelikAdi (opsiyonel):** İstenirse `lib/scraper/a101.ts` ile aynı filtre (Regüler / GrupSpot) eklenebilir.

---

## Özet tablo

| Market  | Kaynak / yöntem        | Kategori ID tipi | Başarılı tarama nerede?                    |
|---------|------------------------|-------------------|-------------------------------------------|
| Migros  | REST `rest/search/screens/{prettyName}` | prettyName (slug) | monitored-scrape, lib/scraper, migros-api |
| Şok     | HTML + Cheerio         | slug + id (`{slug}-c-{id}`) | monitored-scrape, lib/scraper, lib/scraper/sok.ts |
| A101    | REST `getProductsByCategory` | Parent (C01, C05…) + yanıtta yaprak ID filtre | monitored-scrape, lib/scraper.ts (parent+leaf) |

---

## İlgili dosyalar

- **monitored-scrape.ts** — A101 → Şok → Migros sırası, hata logları, DB wipe.
- **lib/scraper.ts** — Cron / toplu tarama; Migros/A101/Şok için aynı endpoint’ler, A101 için A101_HEADERS.
- **lib/scraper/migros-api.ts** — Migros kategori ağacı + yaprak kategoriler + sayfalı ürün çekme.
- **lib/scraper/a101.ts** — Parent kategori ID’leri, nitelikAdi filtresi, fiyat/birim/link parsing.
- **lib/scraper/sok.ts** — Sabit ana kategoriler + sayfadan keşfedilen alt kategoriler, sayfalı tarama.
- **scripts/test-a101-api.ts** — A101 API testi (C01 ile).
- **scripts/test-a101-leaf-kasar.ts** — A101 tek yaprak testi: C05 + C0512 filtre → Kaşar Peyniri.
- **scripts/fetch-a101-kasar.ts** — A101 Kaşar tam akış: parent C05, C0512 filtre, DB upsert, **zombi/şüpheli kuralı**.
- **a101_categories.json** / **migros_categories.json** / **sok_categories.json** — Kategori listeleri (ID, name, path).

---

## Zombi / Şüpheli Ürün Kuralı

- **Kural:** Bir ürün, kendi **yaprak kategorisindeki** ürünlerin **birim fiyat ortalamasının %40 altındaysa** (yani ortalamanın %60’ının altı) ve (isteğe bağlı) sıralamada aşağıdaysa **şüpheli** sayılır; normal listede **gizlenir**.
- **Nerede uygulanıyor:**  
  - `scripts/fetch-a101-kasar.ts`: Kaşar için `marketAvg` (TL/kg), `suspiciousThreshold = marketAvg * 0.6`; birim fiyat < eşik → `isSuspicious = true`. Ek mutlak eşik: 180 TL/kg altı da şüpheli.  
  - `scripts/fetch-sok-kasar.ts`: Aynı mantık (ortalamanın %60’ı altı → şüpheli).
- **Görünürlük:** Normal ürün listesi `app/api/products/route.ts` içinde `isSuspicious: false` ile filtrelenir; şüpheli ürünler API’de **görünmez**.  
- **Admin’de görünür yapmak:** Şu an ayrı bir query parametresi veya admin-only endpoint yok. İleride eklenebilir: örn. `GET /api/products?includeSuspicious=true` (admin oturumu kontrolü ile) veya `GET /api/admin/products?includeSuspicious=true`.

Bu doküman, “neyi nasıl tarayacağımız” ve üç market için başarılı tarama yöntemlerinin tek yerde toplanmış halidir.
