# Kategori otomasyonu — yapılacaklar ve mimari plan

> **Şu anki tek kaynak:** [KATEGORI-SENARYO.md](./KATEGORI-SENARYO.md) — Kategori yolu sadece ODS (ve admin onayı); tags/canonical kullanılmaz. Bu dosya **ileride** kelime→kategori otomasyonu için plan; mevcut sistem ODS + MarketCategoryMapping ile çalışıyor.
>
> 26k eğitim verisinden kelime→kategori kuralları üretip, yeni ürünlerde önce market filtresi + keyword skoru, bulunamazsa AI/manuel fallback ile kategori atama. AI başta sadece öneri; onay sonrası otomatikleşir.

---

## Genel akış (3 katman + fallback)

```
Ürün gelir (market + market_kategori + ürün_adi)
    ↓
[Katman 1] Market kategorisi → aday kategoriler listesi (daraltma)
    ↓
[Katman 2] Ürün adı kelimeleri × rule_keywords → skor (adaylar içinde)
    ↓
Skor eşiği geçiyorsa → kategori ata
    ↓
Geçmiyorsa → [Katman 3] AI önerir → sen onaylarsın (test); ikna olunca doğrudan AI atar
```

---

## Veri yapısı (eğitim seti)

**Kaynak:** Excel veya DB export. Sütunlar:

| Sütun           | Açıklama                          |
|-----------------|-----------------------------------|
| market          | migros / a101 / şok / …           |
| market_kategori | Marketten gelen kategori adı/kodu |
| urun_adi        | Ürün adı (marka, tip, varyant, gramaj içerir) |
| ana_kategori   | Bizim ana kategori                |
| yaprak_kategori | Bizim yaprak kategori             |
| ince_kategori   | Bizim ince yaprak kategori        |

Bu tablo **eğitim veri seti**; kurallar buradan türetilir.

---

## Yapılacaklar listesi (aşama aşama)

### Aşama 1 — Veri hazırlığı

- [ ] **1.1** Eğitim verisini tek yerde topla  
  - Tercih: Excel (örn. `kategori_egitim_seti.xlsx`) veya TSV/CSV.  
  - İçerik: `market`, `market_kategori`, `urun_adi`, `ana_kategori`, `yaprak_kategori`, `ince_kategori` (en az 26k satır mevcut veriyle).

- [ ] **1.2** Gerekirse DB’den export script’i yaz  
  - Mevcut `Product` + `Price` (marketCategoryPath, marketCategoryCode) + senin atadığın kategori alanlarından bu sütunları üreten script (Node/TS veya Python).  
  - Çıktı: yukarıdaki sütunlara sahip dosya.

---

### Aşama 2 — Kelime → kategori istatistiği (Python)

**Araç:** Python 3 + pandas (veya csv modülü). Script: `scripts/category/build_word_category_stats.py` (veya benzeri).

- [ ] **2.1** Ürün adlarını normalize et  
  - Tüm `urun_adi` → küçük harf, Türkçe karakter dönüşümü (ı→i, ğ→g, ü→u, ş→s, ö→o, ç→c).  
  - Noktalama ve gereksiz boşlukları sil.  
  - Kelimelere böl (split); isteğe bağlı: sayı + birim (350, g) ayrı tutulabilir veya atlanabilir.

- [ ] **2.2** Kelime × kategori frekans tablosu üret  
  - Her kelime için: bu kelime hangi **(yaprak veya ince)** kategoride kaç kez geçiyor?  
  - Hedef alan: ince_kategori (veya yaprak_kategori — projede tek tutarlı seçim yap).  
  - Çıktı: `kelime | kategori | adet` (ve toplam adet = o kelimenin toplam geçiş sayısı).

- [ ] **2.3** Güven oranı hesapla  
  - `guven = kategori_adet / toplam_kelime_adet` (örn. 0.97 = %97).  
  - Çıktı: `kelime | kategori | adet | guven`.

---

### Aşama 3 — Otomatik kural tablosu (rule_keywords)

**Araç:** Aynı Python script veya bir sonraki adım script’i.

- [ ] **3.1** Eşik üstü kuralları yaz  
  - `guven > 0.80` (veya belirlenen eşik, örn. 0.85) olan (kelime, kategori) çiftlerini **rule_keywords** tablosuna al.  
  - Çakışma: Aynı kelime birden fazla kategoriye yüksek güvenle gidiyorsa: en yüksek güveni seç veya skor aşamasında her ikisini de kullan (skor = toplam güven).

- [ ] **3.2** rule_keywords çıktı formatı  
  - Dosya: `data/rule_keywords.csv` (veya JSON/DB).  
  - Sütunlar: `kelime | kategori | guven`.  
  - Bu tablo pipeline’da “ürün adındaki kelime → kategori” eşlemesi için kullanılacak.

---

### Aşama 4 — Market kategorisi → aday listesi (category_candidates)

**Araç:** Elle/yarı elle veya script ile doldurulacak tablo.

- [ ] **4.1** category_candidates tablosunu tanımla  
  - Sütunlar: `market_kategori` (marketten gelen ham kategori adı/kodu), `aday_kategoriler` (bizim yaprak veya ince kategorilerden virgülle/liste).  
  - Örnek: A101 "tahin-pekmez-reçel" → helva, tahin, pekmez, reçel, sürülebilir.

- [ ] **4.2** Yeni market eklerken  
  - O marketin tüm kategori listesini al; her biri için “bizde hangi kategorilere düşebilir?” aday listesini yaz.  
  - Dosya: `data/category_candidates.csv` (veya JSON/DB).  
  - Bu katman, kural skorunun **sadece bu adaylar içinde** hesaplanmasını sağlar.

---

### Aşama 5 — Kategori atama pipeline’ı (uygulama kodu)

**Araç:** Proje dili (TypeScript/Node veya Python servis). Mevcut `lib/category-mapper.ts` veya yeni modül.

- [ ] **5.1** Girdi  
  - `market`, `market_kategori`, `urun_adi`.

- [ ] **5.2** Katman 1: Aday listesi  
  - `market_kategori` ile `category_candidates` tablosundan aday kategorileri al.  
  - Bulunamazsa: tüm kategoriler aday sayılabilir veya “Diğer”/onay kuyruğuna at.

- [ ] **5.3** Katman 2: Kelime skoru  
  - `urun_adi` → aynı normalize + kelimelere böl.  
  - Her kelime için `rule_keywords`’ten eşleşen (kelime → kategori) kurallarını al; sadece **aday** kategoriler için skor topla (örn. skor += guven veya skor += 1).  
  - En yüksek skoru veren kategori + eşik (örn. min_skor) geçiyorsa → bu kategoriyi ata (ana/yaprak/ince yolunu mevcut taxonomy’den türet).

- [ ] **5.4** Katman 3: Fallback  
  - Skor eşiği geçilmezse:  
    - **Test aşaması:** AI’a sor (“sadece şu adaylardan birini seç: …”), cevabı **otomatik atama**; sen onay kuyruğunda onaylarsın.  
    - **İkna sonrası:** Aynı AI cevabı doğrudan atanır (onay kuyruğu kapatılabilir).  
  - AI prompt: “Yeni kategori üretme; sadece verilen listeden seç.”

- [ ] **5.5** Çıktı  
  - Atanan `ana_kategori`, `yaprak_kategori`, `ince_kategori` (veya `categoryId`) + kaynak (kural / ai / manuel).

---

### Aşama 6 — Gramaj normalizasyonu (ayrı, opsiyonel bu plana)

**Araç:** Tek regex + küçük bir fonksiyon (mevcut `parseQuantity` / `unit-parser` ile uyumlu olabilir).

- [ ] **6.1** Gramaj regex  
  - `(\d+(?:[\.,]\d+)?)\s?(kg|g|gr|ml|lt|l)` → miktar + birim.  
  - Normalize: 2.5 kg → 2500 g; ml/L birimleri proje birimine çevrilir.  
  - Bu, kategori atamasından bağımsız; ürün eşleme / birim fiyat için kullanılır.

---

### Aşama 7 — Kural güncelleme (sürdürülebilirlik)

- [ ] **7.1** Haftalık (veya periyodik) akış  
  - Yanlış atanan ürünleri düzelt (eğitim setine geri işle veya ayrı düzeltme tablosu).  
  - Eğitim setini güncelle → **Aşama 2–3**’ü tekrar çalıştır: kelime frekansı + `rule_keywords` yeniden üret.  
  - `category_candidates` yeni market/kategori ekledikçe güncellenir.

- [ ] **7.2** Versiyonlama  
  - `rule_keywords` ve `category_candidates` dosyalarının tarih/sürüm bilgisi tutulabilir; pipeline hangi sürümü kullandığı loglarda belirtilir.

---

## Üretilecek / kullanılacak dosya ve tablolar

| Dosya / tablo            | İçerik |
|--------------------------|--------|
| Eğitim seti              | Excel/CSV: market, market_kategori, urun_adi, ana_kategori, yaprak_kategori, ince_kategori |
| rule_keywords            | kelime, kategori, guven (otomatik üretilir) |
| category_candidates      | market_kategori, aday_kategoriler (yarı manuel) |
| regex_rules (opsiyonel)   | Gramaj vb. için rule + açıklama |

---

## Kısa senaryo: Sıfırdan yeni market

1. Yeni marketin kategorilerini listele; her biri için `category_candidates`’a aday kategorileri yaz.  
2. Ürün gelince: market_kategori → adaylar; urun_adi → kelimeler → rule_keywords ile skor.  
3. Skor yeterliyse kategori ata; değilse AI’dan “listeden seç” al, testte sen onayla; sonra doğrudan AI ile otomatikleştir.

---

## Özet

- **Veri:** Eğitim seti (Excel/CSV) → Python ile kelime frekansı + güven → rule_keywords.  
- **Katmanlar:** (1) market_kategori → aday listesi, (2) kelime skoru → kategori, (3) AI öneri → onay/otomatik.  
- **Araçlar:** Python (istatistik + kural üretimi), proje kodu (Node/TS veya Python) pipeline, isteğe bağlı AI API.  
- **Sürdürülebilirlik:** Periyodik düzeltme + aynı script’lerle rule_keywords ve istatistiklerin yeniden üretilmesi.

Bu plan, yapılacaklar listesi olarak takip edilebilir; her madde tamamlandıkça işaretlenir.
