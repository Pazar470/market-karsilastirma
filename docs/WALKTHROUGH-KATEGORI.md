# Walkthrough: Kategori — ODS’ten yolları al, sonra sadece admin ile yeni ürünler

**Tek hedef:** Marketlerdeki dağınık kategori şemalarını ortak kategori ağacı altında toplamak. Önce ODS’teki tüm kategori yollarını bir kez sisteme almak; sonrasında sadece yeni ürünleri admin panelinden yönetmek.

---

## 1. Veri kaynağı (ODS)

- **3 market**, toplam **26.125** satır (ürün bazında; aynı ürün birden fazla satırda/kategoride olabilir).
- Her satır: Market, Market Kategori Kodu, Ürün Adı, Ana Kategori, Yaprak Kategori, İnce Yaprak Kategori, **Manuel** (sütun).
- **Manuel sütunu:** Sadece manuel olanlara "Manuel" yazıldı; **boş = otomatik**. Yani boş olan (market, kategori kodu) çiftleri otomatik kabul edilir (tek yol, tüm ürünler + gelecekler o yolu alır).

---

## 2. (Market + kategori kodu) türleri

### Otomatik (Mapping)
- ODS’te Manuel sütunu **boş**.
- Tek kategori yolu; o market + o koddan gelen **tüm ürünler** (mevcut ve gelecek) bu yolu alır.
- Admin’e düşmez.

### Manuel (MarketCategoryManuel)
- ODS’te Manuel sütunu **dolu** ("Manuel" yazılı).
- Ürün bazında farklı yollar atanır (ODS veya admin’de tek tek).
- **Bir ürüne bir kez yol verilince** (ODS veya admin) o ürün bir daha admin’e **hiç düşmez**.
- O manuel koddan **yeni id’li ürün** gelirse → bir kez admin’e sunulur; yol verilir, kaydedilir; sonraki taramalarda tekrar sorulmaz.

---

## 3. Yeni kategori kodu (ilk kez görülen)

- Market, daha önce taramada görmediğimiz bir **yeni kategori kodu** çıkarırsa, o koddaki tüm ürünler **bir kez** admin panelinde listelenir.
- **Admin seçimi:**
  - **Otomatik:** Tek yol seçilir, "Uygula/Kaydet" denir → o yol **tüm kategoriye** (mevcut + gelecek) uygulanır; Mapping’e yazılır.
  - **Manuel:** "Manuel listesine al" denir → o koddaki ürünlere tek tek yol verilir; yeni gelecekler de admin onayına düşer, onlara da admin kategori yolu belirler; bir kez yol verilen ürün bir daha sorulmaz.

---

## 4. ODS sağlamlığı (ürün ID)

- İsim değişirse eşleşme kaybolmasın diye ODS’te **9. sütun = Ürün ID** (sistemdeki product id) kullanılır.
- Bir kerelik: Tüm ODS satırları için (market + ürün adı) ile DB’de eşleşen ürünün id’si bulunup 9. sütuna yazılır. Aynı ürün birden fazla satırda (farklı kategori) geçiyorsa **her satırda aynı ID** yazılır. Eşleşmezse **aynı markette benzer isim** (bir isim diğerini içeriyorsa, ≥10 karakter) ile fallback eşleşme denenir; böylece daha fazla satıra ID düşer.
- Eşleşmeyen satırlar için **detaylı log** tutulur: `docs/ods-id-assignment-log.txt`, `docs/ods-unmatched-keys.tsv`.
- **Tam tarama sonrası** (özellikle Şok sayfa limiti artırıldıysa) `write-ods-product-ids` tekrar çalıştırılırsa daha fazla satır eşleşebilir.

---

## 5. Tek seferlik yapılacaklar (otomasyon sırası)

1. **Çift market birleştir:** Aynı URL’ye sahip marketler (örn. Şok/Sok) tek kayda toplanır; eşleşme tek isimle yapılır.
2. **ODS’e ürün ID’lerini yaz:** ODS okunur; her satır için (market + ürün adı) ile DB’de ürün aranır; bulunursa 9. sütuna ID yazılır (aynı ürün birden fazla satırda ise hepsine aynı ID). Eşleşmeyenler için detaylı log (sebep + örnekler).
3. **Kategori yollarını sisteme al:** ODS (veya 9. sütunlu TSV) import edilir: Category ağacı, Mapping (Manuel boş olanlar), Manuel (Manuel dolu olanlar). **Product.categoryId** sadece **otomatik** (Manuel boş) satırlar için güncellenir; Manuel kategorideki ürünlere ODS’ten yol atanmaz, admin’de kalır.
4. **Doğrulama:** `verify-admin-after-scan` — Manuel kategorideki null ürünler “beklenen” sayılır; sadece otomatik kategoride olup ODS’te yolu olduğu hâlde null kalanlar hata sayılır.

---

## 6. Sonrası (sürekli davranış)

- **Tarama:** Yeni ürün için (market, kategori kodu) Mapping’te varsa → otomatik yol atanır; Manuel’de varsa → categoryId atanmaz (admin’e düşer); **yeni kod** ise → tüm ürünler admin’e düşer.
- **Admin:** Sadece `categoryId = null` ürünler listelenir; bir kez yol atanmış ürün tekrar listelenmez. Yeni kategori kodu için **Otomatik** (tek yol, Kaydet) veya **Manuel** (Manuel listesine al, tek tek atama) seçimi yapılır.
- **Yeni market / yeni kategori kodu:** Aynı kurallar geçerli; otomatik veya manuel admin seçimi ile ilerlenir.

---

## 7. Kabul kriterleri

- ODS’teki yollar tek seferlik sisteme alınmış.
- ODS’te 9. sütun (Ürün ID) mümkün olan tüm satırlarda doldurulmuş; mükerrer ürünlerde aynı ID her satırda; eşleşmeyenler için detaylı log üretilmiş.
- Yol verilmiş ürünler admin onay listesinde çıkmıyor.
- Yeni ürün / yeni kod senaryoları bu dokandaki kurallara uyuyor.

---

## 8. Tek seferlik komut sırası

Aşağıdaki sırayla çalıştır. Tüm işlemler senin müdahalen olmadan tamamlanır.

```bash
# 1) Çift market birleştir (Şok/Sok aynı URL → tek kayıt)
npx tsx scripts/merge-duplicate-market.ts

# 2) ODS'ten ürün ID'lerini çek; 9. sütunlu TSV + log yaz
npx tsx scripts/write-ods-product-ids.ts "docs/tum_urunler_manuel.ods"
# Çıktı: docs/tum_urunler_manuel_with_ids.tsv
# Log: docs/ods-id-assignment-log.txt | docs/ods-unmatched-keys.tsv

# 3) Kategori yollarını sisteme al (9. sütunlu TSV ile; ürün güncellemesi chunked, hızlı)
npx tsx scripts/clean-and-import-ods.ts "docs/tum_urunler_manuel_with_ids.tsv"
# Veya önce sadece Mapping/Manuel: npx tsx scripts/import-only-mapping-manuel.ts "docs/tum_urunler_manuel_with_ids.tsv"
# Sonra ürün yolları: npx tsx scripts/apply-ods-product-categories.ts "docs/tum_urunler_manuel_with_ids.tsv"

# 4) Ürün yollarını uygula (import yavaşsa bunu ayrı çalıştır)
npx tsx scripts/apply-ods-product-categories.ts "docs/tum_urunler_manuel_with_ids.tsv"

# 5) Doğrulama
npx tsx scripts/verify-admin-after-scan.ts "docs/tum_urunler_manuel_with_ids.tsv"
```

- **Eşleşmeyen satır analizi:** `docs/ods-id-assignment-log.txt` ve `docs/ods-unmatched-keys.tsv` — hangi (market + ürün adı) DB’de yok, market bazında sayı ve örnekler.
- **Sayı özeti:** `npx tsx scripts/diagnose-ods-vs-db.ts "docs/tum_urunler_manuel.ods"` — ODS/DB satır eşleşmesi, aynı ürün iki kategoride mi.
