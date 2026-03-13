# Alarm kurma + Takip edilen ürünler – Yapılacaklar tablosu

## A. İlk alarm kurma akışı (aynı sayfa, ana sayfa renkleri)

| # | Yapılacak | Detay |
|---|-----------|--------|
| A1 | Koyu/mavi modal kaldır | Yeni alarm akışı artık adım adım modal (1-2-3-4) değil; tek sayfa, ana sayfa görünümü (beyaz/açık gri arka plan). |
| A2 | Kategori seçimi = ana sayfa gibi | Kategori arama/liste, ana sayfadaki “Kategoriler” paneliyle aynı renk ve stil (2. görsel): beyaz kutu, “Kategori ara…”, “Tüm Ürünler”, ağaç liste. İleri/geri adım yok. |
| A3 | Kategori seçilince hemen ürünler | Kategori seçildiği anda aynı sayfada, 3. görseldeki gibi o kategorideki tüm ürünler küçük kart grid’i olarak listelensin (ana sayfa ürün kartı stili). |
| A4 | Sağ üstte hedef fiyat alanı | Sayfada sağ üstte 4. görseldeki gibi “Hedef birim fiyat (₺)” input + birim (KG vb.) hazır beklesin. |
| A5 | Alarmı kaydet → şablona dönüş | “Alarmı kaydet” tıklanınca sayfa, 5. görseldeki alarm düzenleme şablonuna dönüşsün (hedef fiyatı karşılayan / karşılamayan / gizlenen üç bölüm, aynı grid). |

---

## B. Tüm ürün kartlarında: Takibe al + Sepete ekle

| # | Yapılacak | Detay |
|---|-----------|--------|
| B1 | Alarm sayfası kartları | Hedef fiyatı karşılayan, karşılamayan ve gizlenen tüm ürün kartlarında: **Takibe al** (ve takipte ise **Takibi bırak**) + **Sepete ekle** butonları olsun. |
| B2 | Anasayfa ürün kartları | Anasayfadaki ürün listesinde de **Takibe al / Takibi bırak** eklensin (şu an sepete ekle + alarma ekle var; takip de eklenecek). |
| B3 | Ürün detay sayfası | Tekil ürün detay sayfasında tüm aksiyonlar olsun: **Alarma ekle**, **Sepete ekle**, **Takibe al / Takibi bırak**. |

---

## C. “Takip edilen ürünler” bölümü / sayfası

| # | Yapılacak | Detay |
|---|-----------|--------|
| C1 | Takibe alınmış ürünler alanı | Anasayfada (veya menüde) “Takip edilen ürünler” sekmesi/sayfası olsun; sadece takibe alınmış ürünler listelensin. |
| C2 | Kategori bazlı gruplama | Takip edilen ürünler **kategori bazlı** gruplansın. Örn: “Süt ürünleri > Kaşar” başlığı altında o kategorideki takip edilen ürünler; “Anne & Bebek > Bebek > Bebek bezi” altında o kategoridekiler. |
| C3 | Sadece dolu kategoriler | Sadece en az bir takip edilen ürünü olan kategoriler için başlık + liste gösterilsin; boş kategoriler statik başlık olarak eklenmesin. |
| C4 | Kart stili | Her kategorideki ürünler, alarm sayfasındaki gibi **küçük ürün kartları** (grid, satırda 4–6) ile gösterilsin. Her kartta **Takibi bırak** + **Sepete ekle** (ve gerekirse alarma ekle) olsun. |

---

## D. Veri / backend (kısa)

| # | Yapılacak | Detay |
|---|-----------|--------|
| D1 | Takip bilgisini saklama | Kullanıcı–ürün “takibe al” ilişkisi tutulmalı (yeni tablo veya mevcut yapıda alan). Takibe al / takibi bırak API’leri. |
| D2 | Takip edilenleri listeleme | “Takip edilen ürünler” sayfası için kategori bazlı listeyi döndüren API (kullanıcıya özel, kategori ağacı + ürünler). |

---

## Özet sıra (onay sonrası)

1. **A** – Yeni alarm kurma: tek sayfa, ana sayfa renkleri, kategori → ürünler → hedef fiyat → Alarmı kaydet → 5. görsel şablonu.
2. **D** – Takip (takibe al/takibi bırak) veri modeli ve API.
3. **B** – Tüm ilgili kartlara Takibe al / Takibi bırak + Sepete ekle; detay sayfasına tüm aksiyonlar.
4. **C** – Anasayfada “Takip edilen ürünler” bölümü/sayfası, kategori bazlı, sadece dolu kategoriler, küçük kart grid.

Onaylarsan bu sırayla uygulamaya geçerim.
