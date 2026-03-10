# Kategori Kaçırma Önlemi — A101 ve Migros Yöntem Önerisi

Amaç: Şok’taki gibi taramadan önce kategori listesini canlıdan güncelleyip **yaprak kategori** bazında tarama yapmak; yeni ana kategori eklenirse fark edip raporlamak. **Her zaman yaprak kategoriye ulaşıp yaprak bazlı arama** yapıyoruz (kendi kategori ağacımız buna göre).

---

## Mevcut yapı (özet)

| Market  | Kategori kaynağı              | Yaprak nasıl elde ediliyor                          | Taramadan önce güncelleme |
|---------|-------------------------------|-----------------------------------------------------|----------------------------|
| Şok     | 19 ana URL + ana sayfa        | Her ana sayfadan `a[href*="-c-"]` → alt kategoriler | Var (`runSokCategoryDiscovery`) |
| A101    | `a101_categories.json`       | `extract-a101-categories`: 15 sabit parentId (C01..C15) → API `children` → yaprak | Yok |
| Migros  | `migros_categories.json`     | `extract-migros-categories`: tek API `rest/categories` → ağaç flatten → yaprak | Yok |

- **Scraper:** Hepsi yaprak liste kullanıyor (A101 parentId gruplarıyla çekip ürünü yaprak id’ye eşliyor; Migros/Şok doğrudan yaprak kategori sayfası/API).
- **Risk:** A101 ve Migros’ta liste statik; site yeni ana kategori eklediğinde kaçırıyoruz.

---

## 1. Migros — Önerilen yöntem

**Sayfa/API yapısı:** Tek endpoint var: `https://www.migros.com.tr/rest/categories`. Cevap tüm kategori ağacını döndürüyor; `extract-migros-categories.ts` bunu alıp `flattenCategories` ile **sadece yaprakları** (children’ı olmayan) çıkarıyor. Zaten yaprak bazlı çalışıyoruz.

**Öneri:**

1. **Taramadan hemen önce** (Şok’taki gibi) Migros için bir “kategori keşfi” adımı ekle.
2. Bu adımda **sadece** `GET https://www.migros.com.tr/rest/categories` çağrılsın, gelen ağaç mevcut `extract-migros-categories` mantığıyla flatten edilsin, çıkan **yaprak liste** `migros_categories.json` olarak yazılsın.
3. Tarama bu dosyayı okusun; değişiklik yok, sadece dosya her turda canlıdan üretilmiş olur.

**Sonuç:** Yeni kategori veya yapı değişikliği API’de ne ise dosyaya yansır; **ek ana sayfa / yedek tarama gerekmez**. Keşif = tek API + aynı yaprak flatten mantığı.

**Kod tarafı:** `extract-migros-categories.ts` içindeki mantık bir modüle (örn. `lib/migros-category-discovery.ts`) taşınır; `run-full-scan-offline.ts` içinde Migros’tan önce bu modül çağrılır → `migros_categories.json` güncellenir. Scraper aynı dosyayı okumaya devam eder, **hep yaprak** işlenir.

---

## 2. A101 — Önerilen yöntem

**Sayfa/API yapısı:**

- Ürün listesi: `rio.a101.com.tr/.../Store/getProductsByCategory/VS032?id=<parentId>`. `parentId` = C01, C02, … C15 gibi **üst seviye ID**. Cevapta `children` var; her child’ın `children`’ı varsa onlar yaprak, yoksa kendisi yaprak. Yani **yaprak listesi** bu API’den, parentId başına bir istekle elde ediliyor.
- Ana kategori listesi: A101’in public “tüm ana kategorileri” dönen bir API’si yok; ID’ler şu an `extract-a101-categories.ts` içinde sabit (C01..C15).
- **Yedek kaynak:** `https://www.a101.com.tr/sitemaps/categories-kapida.xml` — Kapıda kategori sitemap’i. `check-sitemap.ts` buradan root slug’ları (meyve-sebze, et-tavuk-sarkuteri, …) çıkarıyor. Yani “sitede hangi ana kategoriler var?” bilgisi sitemap’ten alınabiliyor.

**Zorluk:** API **parentId** (C01, C02) istiyor; sitemap’te **slug** var (meyve-sebze, su-icecek). Slug → ID eşlemesi kodda dağınık (get-a101-ids, check-sitemap OUR_LIST, extract’taki CATEGORY_IDS). Yeni bir root slug sitemap’te çıksa, ona karşılık gelen C16’yı otomatik bulamıyoruz; API’de slug ile kategori dönen endpoint yok.

**Öneri (iki katman):**

**A) Yaprak listesini her taramada tazele (kategori kaçırma riskini azaltır)**  
- Taramadan önce, **şu an kullandığımız 15 parentId** (C01..C15) için `getProductsByCategory` ile çocukları çekip yaprak listesini oluştur (mevcut `extract-a101-categories` mantığı).  
- Çıktıyı `a101_categories.json` olarak yaz.  
- Böylece aynı 15 ana kategori altındaki **yaprak değişiklikleri** (yeni alt kategori, kaldırılan vb.) her taramada yansır; tarama **yine tamamen yaprak bazlı** kalır.

**B) Yeni ana kategori uyarısı (yedek kontrol)**  
- Taramadan önce (veya A adımından önce) **sitemap** çek: `categories-kapida.xml` → Kapıda’daki tüm kategori URL’lerinden **root slug** listesini çıkar (mevcut `check-sitemap` mantığı).  
- Bilinen 15 root slug ile karşılaştır (OUR_LIST / CATEGORY_IDS’e karşılık gelen slug’lar).  
- Sitemap’te olup listemizde **eşleşmeyen** root slug varsa: “Olası yeni ana kategori: …” diye log/rapor yaz. Elle CATEGORY_IDS’e ekleyip ID’yi (C16 vb.) sonradan çözebilirsin.  
- Bu adım **sadece uyarı**; tarama yine mevcut 15 ID’den üretilen yaprak listesiyle yapılır, yaprak bazlı çalışma bozulmaz.

**Özet A101:**  
- **Keşif:** (1) 15 parentId ile API’den yaprak listesini al → `a101_categories.json`. (2) İsteğe bağlı: sitemap’ten root slug’ları al, bilinenlerle karşılaştır, eksik/ekstra slug’ları raporla.  
- **Taramada:** Sadece `a101_categories.json` kullanılır; scraper zaten parentId gruplarına göre çekip ürünü yaprak id’ye atıyor — **hep yaprak kategori bazlı**.

---

## 3. Akış özeti (tüm marketler)

- **Şok:** (Zaten var) Ana kategori URL’leri + ana sayfa → alt kategoriler → yaprak liste → `sok_categories.json`; tarama yaprak bazlı.
- **Migros:** Taramadan önce `rest/categories` → flatten → yaprak liste → `migros_categories.json`; tarama yaprak bazlı.
- **A101:** Taramadan önce (1) 15 parentId → API → yaprak liste → `a101_categories.json`; (2) İsteğe bağlı: sitemap’ten root slug’ları çek, “listede olmayan” uyarısı ver. Tarama yaprak bazlı.

Üçünde de **çıktı hep yaprak kategori listesi**; scraper tarafında ek değişiklik gerekmez, sadece taramadan önce ilgili JSON’ların canlıdan üretilmesi ve (A101’de) sitemap ile uyarı eklenmesi yeterli.

---

## 4. Uygulama notları

- **Migros:** `lib/migros-category-discovery.ts` (veya benzeri) + `run-full-scan-offline.ts` içinde Migros’tan önce çağrı.
- **A101:** `lib/a101-category-discovery.ts` (veya benzeri): (a) 15 ID ile yaprak listesi üret → `a101_categories.json`; (b) isteğe bağlı sitemap isteği → root slug’ları raporla. `run-full-scan-offline.ts` içinde A101’den önce çağrı.
- **Config:** Şok’taki gibi A101 için ana kategori ID listesi (C01..C15) config’te tutulabilir; yeni ID eklendiğinde sadece config güncellenir.
- **Sitemap OUR_LIST:** A101 slug eşlemesi tek yerde (config veya discovery modülü) toplanırsa sitemap karşılaştırması ve “yeni ana kategori” uyarısı sürdürülebilir olur.

Bu yapı ile **hiçbir kategoriyi kaçırmamak** hedefine, yaprak bazlı tasarımı bozmadan yaklaşılmış olur.
