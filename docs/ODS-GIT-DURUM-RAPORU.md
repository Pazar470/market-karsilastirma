# ODS / Git / Tarama Durum Raporu

**Tarih:** 2026-03-10  
**Yapılan kontroller ve kalıcı düzeltmeler.**

---

## 1. Tarama ODS okumuyor mu?

**Sonuç: Evet, tarama ODS okumuyor.**

- `run-full-scan-offline.ts` sadece şunları kullanıyor:
  - `runFullScrapeBatch` (scraper)
  - `upsertProductBatch` (db-utils)
  - `syncMappingToNullProducts` (category-sync)
  - `checkAlarmsAfterScrape` (alarm-engine)
- Hiçbir yerde `readOdsAsTsv`, `clean-and-import-ods`, `import-category-from-tsv` veya ODS dosyası çağrılmıyor.
- Yorum satırında da belirtildiği gibi: "ODS her taramada okunmaz."

---

## 2. ODS nerede okunuyor? (Sadece manuel script’ler)

ODS aşağıdaki yerlerde okunuyor; **hepsi senin manuel çalıştırdığın** komutlar:

| Nerede | Ne zaman |
|--------|----------|
| `lib/category-sync.ts` → `readOdsAsTsv()` | `getOdsProductKeysWithPath`, `getOdsProductIdsWithPath`, `applyOdsCategoryPathsToProducts` çağrıldığında |
| `scripts/clean-and-import-ods.ts` | Sen çalıştırınca: `npx tsx scripts/clean-and-import-ods.ts "docs/tum_urunler_manuel.ods"` |
| `scripts/import-category-from-tsv.ts` | ODS veya TSV path verilince (clean-and-import içinden veya doğrudan) |
| `scripts/apply-ods-product-categories.ts` | Sen çalıştırınca |
| `scripts/write-ods-product-ids.ts` | Sen çalıştırınca |
| `scripts/diagnose-ods-vs-db.ts` | Sen çalıştırınca |
| `scripts/verify-admin-after-scan.ts` | Sen çalıştırınca (opsiyonel ODS path) |
| `scripts/run-tatbikat-after-reset.ts`, `scripts/run-full-tatbikat.ts` | Tatbikat senaryosu çalıştırılınca |

**Stratejiye etkisi:** Tarama ve günlük akış tamamen Supabase’teki Category, MarketCategoryMapping, MarketCategoryManuel tablolarına dayanıyor. ODS sadece bu tabloları (ve isteğe bağlı mevcut ürün yollarını) güncellemek için **sen ODS’i değiştirdiğinde** bir kez çalıştırdığın script’lerde okunuyor. Yani ODS’i “kalıcı kapatmak” (Git’in diff için okumasını durdurmak) bu stratejiye zarar vermiyor.

---

## 3. Bugün 2 taramada neden 0 ürün admin’e düştü?

**Mantık kontrolü (kod):**

- **Yeni ürün (ilk kez gelen link):** `upsertProductBatch` içinde (db-utils.ts):
  - (market, categoryCode) **Manuel**’deyse → `categoryId = null` (admin’e düşer).
  - Manuel’de değilse Mapping’e bakılır; varsa `categoryId` atanır, yoksa null.
- **Mevcut ürün:** Taramada `categoryId` güncellenmez (korunur).
- **Mapping senkronu:** Sadece `categoryId = null` olan ürünler için Mapping’te eşleşme varsa categoryId doldurulur.

**Olası nedenler (0 admin ürünü):**

1. **Bu turda yeni ürün yok (created = 0):** Aynı ürün linkleri tekrar geldi; hepsi zaten DB’de. Yeni kayıt oluşmadığı için yeni “null” da eklenmedi.
2. **Yeni ürün var ama hepsi Mapping’te:** Yeni gelen (market, kod) çiftleri Mapping’te tanımlı olduğu için yeni ürünlere de categoryId atandı; Mapping senkronu da kalan null’ları doldurdu.
3. Raporlarda “Bu turda yeni eklenen ürün (market bazında)” ve “Tarama sonrası categoryId=null kalan” satırları ekli; bir sonraki tam taramada bu sayılar rapor dosyasında görülecek. Önceki raporlarda bu blok yoktu (eklendiği için eski çalıştırmalarda yok).

**Kural değişikliği yok;** davranış NOTLAR’daki akışla uyumlu. Admin’de 0 görünmesi, “bu turda ya yeni ürün yok ya da gelen yeniler Mapping’te eşlendi” ile tutarlı.

---

## 4. Cursor “boşa fazla tab” açması

Proje kodunda pencere veya sekme açan bir çağrı (window.open, yeni tab vb.) **yok**. Fazla sekme / çoklu Cursor örneği büyük ihtimalle:

- Cursor ayarı: “Startup: Restore previous windows” / “Open previous folder” ile her açılışta eski sekmelerin geri gelmesi,
- Veya arka planda kalan Cursor süreçleri.

Proje tarafında yapılabilecek ek bir “tab kapatma” işlemi yok; istenirse Cursor ayarlarından “Restore windows” kapatılabilir.

---

## 5. Yapılan kalıcı düzeltmeler (Git – odt2txt kapatma)

### A) Global Git attributes (bilgisayar genelinde)

- **Dosya:** `%USERPROFILE%\.gitattributes_global`  
  **İçerik:**
  ```
  *.ods binary
  *.odt binary
  *.odp binary
  ```
- **Ayar:** `git config --global core.attributesfile` → `C:\Users\Muhammet\.gitattributes_global` olarak ayarlandı.

Böylece **tüm repolarda** Git, .ods / .odt / .odp için diff (ve dolayısıyla odt2txt) çalıştırmayacak. Proje kodunun ODS’i okuma stratejisi değişmedi; sadece Git’in bu dosyaları “diff için” açması kapatıldı.

### B) Proje içi .gitattributes

- Proje kökünde `.gitattributes` zaten var: `*.ods binary`, `*.odt binary`, `*.odp binary`.
- Bu repoda Git yine ODS’i diff’lemez; global ayar yedek olarak tüm repolarda geçerli.

---

## 6. Özet

| Konu | Durum |
|------|--------|
| Tarama ODS okuyor mu? | Hayır; tarama sadece scraper + DB + mapping senkronu. |
| ODS sadece manuel script’lerde mi? | Evet; clean-and-import, apply-ods, write-ods-product-ids, diagnose, verify-admin vb. |
| 0 admin ürünü neden? | Bu turda ya yeni ürün yok (created=0) ya da yeniler Mapping’te eşlendi; kural değişmedi. |
| Cursor fazla sekme | Proje kodunda tab açan bir şey yok; Cursor ayarı / eski pencereler. |
| odt2txt kalıcı kapatma | Global `.gitattributes_global` + `core.attributesfile` ayarı yapıldı. |

Bilgisayarı yeniden başlattıktan sonra Cursor’u açıp bir süre çalışırken Görev Yöneticisi’nde `odt2txt` / `sh` süreçlerinin tekrar artıp artmadığını kontrol edebilirsin; artmaması gerekir.
