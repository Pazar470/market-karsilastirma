# Proje notları

Sadece unutulmaması gereken kurallar ve operasyon. Her cevap buraya alınmaz; önemli kısımlar için “not alayım mı?” diye sorulur.

---

## 1. Kategori: ODS bir kez, sonra admin

- ODS’i **bir kez** import et: Category ağacı + **MarketCategoryMapping** (market+kod → categoryId) + **MarketCategoryManuel** (bu kodlardan gelen ürünler hep admin onayına). Sonra günlük işlem admin panelinden.
- **Hangi ürün hangi kategori:** Her ürünün `Product.categoryId` ve `Product.category` alanı var. **Yeni** taramada gelen ürün için kategori şöyle atanır: (marketName, marketCategoryCode) önce **MarketCategoryManuel**’de var mı bakılır; varsa categoryId atanmaz (admin onayına düşer). Yoksa **MarketCategoryMapping**’e bakılır; orada varsa o categoryId yazılır. Yani mapping = “bu market bu kategori kodu → şu categoryId”; yeni ürün gelince bu tablolara bakılıyor.

---

## 2. Kullanıcıya ne gösteriyoruz?

- **categoryId dolu** olan ürünler (kategori akışı tamamlanmış).
- **Sadece güncel market:** Son **1 gün** (24 saat) içinde fiyatı olan ürünler. Günlük tarama — o gün markette yoksa bizde yok; yarın taramada varsa yine gösteririz.
- DB’de eski kayıt kalabilir ama listeye almıyoruz; 1 günden eski fiyat = “yok” hükmünde.

---

## 3. Tarama vs ODS import

- **Tarama (her gün):** Market(ler)den o an dönen liste alınır; her ürün için Product varsa güncellenir + Price eklenir, yoksa Product oluşturulur + Price eklenir. O turda **gelmeyen** ürünlere dokunulmaz (silinmez) ama kullanıcıya **gösterilmez** çünkü “son 1 günde fiyat” filtresi var.
- **ODS import:** Sadece ilk kurulum veya ODS değişince; Category + Manuel + Mapping + mevcut ürünlerin kategori alanları. 26k satır, nadiren. Her taramada ODS okunmaz.

---

## 4. ODS import nereye yazar?

- **Category:** ODS’teki ağaç upsert; ODS’te olmayan kategoriler silinir.
- **Product:** Sadece (market+ürün adı) eşleşenlerin categoryId/category güncellenir; ürün oluşturulmaz.
- **MarketCategoryManuel:** Manuel dolu (market+kod) çiftleri.
- **MarketCategoryMapping:** Manuel olmayan (market+kod) → categoryId.

---

## 5. Senin yapacakların (kısa)

- **Tek hedef:** Şu anki ODS’teki ürünlere yol atanacak; bundan sonra sadece **yeni** ürünler (ve kurallara göre admin’e düşmesi gerekenler) admin’de görünecek. Yol verdiğin ürünler bir daha admin’e düşmez.
- Günde bir kez “tarama yap” de; tarama komutu: bölüm 10.
- Yeni market kategori kodu çıkarsa Admin’den kategori yolu seç, Kaydet.
- ODS değiştirdiysen bir kez import: `npx tsx scripts/clean-and-import-ods.ts "docs/tum_urunler_manuel.ods"`.
- **Market çift kayıt (Şok/Sok):** Supabase’te aynı market iki satırda (örn. “Şok” ve “Sok”, aynı URL) ise eşleşme bozulur. Bir kere: `npx tsx scripts/merge-duplicate-market.ts` — aynı URL’ye sahip marketler tek kayda birleştirilir. Sonra ODS’te market adı tutarlı olsun (tercihen “Şok”).
- **ODS vs DB sayıları:** “Neden 26k değil 17k?” gibi: `npx tsx scripts/diagnose-ods-vs-db.ts "docs/tum_urunler_manuel.ods"` — eşleşen / eşleşmeyen satır, aynı ürün iki kategoride mi çıktısı verir.
- Supabase tablo yoksa hazır SQL’i çalıştır (agent verir).

---

## 6. Kurulum / deploy

- Supabase: `SUPABASE-BAGLANTI.md`, `SUPABASE-*.sql` (tablolar).
- Vercel: `VERCEL-DEPLOY.md`.
- Diğer ayrıntılar ihtiyaç olunca bu dosyaya eklenir; yeni .md açılmaz.

---

## 7. MVP sonrası — yapılacaklar

- **Product silinmeyecek, sadece Price periyodik silinecek:** Kategori atamalarımızı (Product.categoryId) kaybetmemek için **Product kayıtları silinmeyecek**. Temizlik/silme yapılacaksa **sadece Price kayıtları** periyodik olarak silinecek (eski fiyat kayıtları). İleride Product'ı da silmek isterseniz, o zaman ayrı atama tablosu veya TSV'ye düzenli export + append ile yolları koruma yoluna gidilebilir.
- **Price tablosu budama:** Her taramada Price satırı ekleniyor, silinmiyor; tablo süresiz büyür. MVP sonrası periyodik işlem: belirli bir günden eski fiyatları (örn. 10 günde bir; free plana göre gün sayısı optimize edilebilir) uygun formatta **yerelde yedekle** (ben bilgisayarımda tutarım), sonra bu kayıtları **veritabanından sil**. Böylece DB’de sadece son dönem fiyatları kalır; eski veri yedeklenmiş olur, silinir.

---

## 8. Kategori atama: Manuel vs otomatik (ürün bazında)

- **Otomatik (Mapping’te olan market+kod):** O market kategorisi için tek yol belirlenir. O kategorideki tüm ürünler ve ileride gelen yeni ürünler bu yola otomatik atanır; admin onayına düşmez.
- **Manuel (MarketCategoryManuel’de olan market+kod):** Bu kategorideki ürünler **ürün bazında** farklı yollara atanabilir (örn. market “salça ve soslar” tek kodda döndürüyor; biz bir kısmını Salça, bir kısmını Soslar yapıyoruz). Admin mevcut ürünlere tek tek yol atar; atanan ürünler bir daha sorulmaz. Bu market kategorisinde **yeni ürün** çıkarsa sadece o yeni ürün(ler) admin onayına sunulur.
- **Yeni market kodu (ilk kez görülen):** Tüm ürünlerle birlikte admin onayına sunulur. Admin tek yol verip otomatik derse: o kategoridekiler + yeniler o yola otomatik gider. Admin manuel derse: ürün bazında yol atanır; atananlar bir daha sorulmaz, o kategoride yeni ürün çıkarsa sadece o yeni ürün(ler) admin onayına gelir.
- **Admin erişimi:** Sadece belirli URL ve şifre ile. Kullanıcı arayüzünde (ana sayfa, header, menü) Admin’e veya Tarama / Kategori eşlemesi sayfalarına giden link, sekme veya düğme **olmayacak**.
- **Bir kez yol verilmiş = bir daha admin’e düşmez:** Manuel kategoride bile bir ürüne bir kez kategori yolu atandıysa (Product.categoryId set) o ürün bir daha admin onay listesinde **gösterilmez**. Admin’e sadece **henüz categoryId=null** olan ürünler düşer; yani sadece manuel kategorideki **yeni** ürünler veya market’in **yeni** kategorisi.
- **ODS import ürünleri sıfırlamaz:** `clean-and-import-ods` artık tüm ürünlerin categoryId’sini null yapmıyor. Sadece Mapping/Manuel tabloları temizlenir; import sadece ODS’te (market+ürün adı) eşleşen ürünlerin categoryId’sini günceller. Eşleşmeyen veya ODS’te olmayan ürünlerin mevcut yolu **korunur**.
- **ODS = bir kere, sonra sadece Mapping + admin:** (1) **Bir kere** (veya ODS değişince): `npx tsx scripts/clean-and-import-ods.ts "docs/tum_urunler_manuel.ods"` — Category + Mapping + Manuel + ODS’te eşleşen ürünlerin categoryId’si yazılır; diğer ürünlere dokunulmaz. (2) **Her tam taramadan sonra** sadece **Mapping senkronu** otomatik çalışır (offline: `run-full-scan-offline.ts`; cron: `app/api/cron/scan`): Mapping’te olan (market, kod) için hâlâ categoryId=null olan ürünler o mapping’in categoryId’si ile güncellenir. Yeni (market, kod) veya manuel kategoride yeni ürün → admin onayına düşer. ODS’i sonradan güncellediysen: tekrar `clean-and-import-ods` veya sadece ürün yolları için `npx tsx scripts/apply-ods-product-categories.ts "docs/tum_urunler_manuel.ods"`. Manuel sadece Mapping senkronu: `npx tsx scripts/sync-mapping-to-null-products.ts`.
- **ODS’te Ürün ID sütunu (9. sütun):** Eşleşme önce **Ürün ID** ile yapılır: satırda 9. sütun (Ürün ID) dolu ve sistemde bu ID varsa, isim değişse bile o ürün güncellenir; admin’e düşmez. ID yoksa (market + ürün adı) ile eşleşme kullanılır. `write-ods-product-ids` aynı markette benzer isim (içerme) ile fallback ID atar. Mevcut ODS’ine ID’leri doldurmak için: `npx tsx scripts/write-ods-product-ids.ts "docs/tum_urunler_manuel.ods"` → `docs/tum_urunler_manuel_with_ids.tsv` + log.
- **Manuel kategoride ODS’ten yol atanmaz:** Apply/import sadece **otomatik** (Manuel sütunu boş) satırlar için Product.categoryId günceller; Manuel kategorideki ürünler admin’de kalır, tek tek atanır.
- **Şok tarama:** Kategori başına en fazla 200 sayfa (SOK_MAX_PAGES_PER_CATEGORY); tam ürün çekmek için yeterli.

---

## 9. Tatbikat: Tam senaryo (kategori, mapping, manuel, admin)

**Otomasyon:** Tam taramayı çalıştırdığında (offline veya cron) akış zaten otomatik: İndirme → Upload → **Mapping senkronu** (null ürünler mapping’e göre dolar) → Alarm. Sen ekstra bir şey çalıştırmıyorsun.

**Tatbikat için yapılacaklar:**

- **Bir kere ODS import** (ilk kurulum veya ODS güncellendiyse):  
  `npx tsx scripts/clean-and-import-ods.ts "docs/tum_urunler_manuel.ods"`  
  → Category, Mapping, Manuel ve ODS’teki ürün yolları yazılır.

- **Tam tarama:**  
  `npx tsx scripts/run-full-scan-offline.ts`  
  → Geri kalanı (mapping senkronu dahil) otomatik.

- **İsteğe bağlı doğrulama:** Tarama bittikten sonra “ODS’de yolu olan ürün admin’de kalmamalı” demek için:  
  `npx tsx scripts/verify-admin-after-scan.ts`  
  → “ODS’de yolu olup admin’de kalan: 0” görmelisin.

**Sıfırdan tatbikat (eski veriyi temizleyip baştan):**  
Veriyi sil (SQL veya `reset-for-tatbikat.ts`) → ODS import → tam tarama. **Önemli:** Veri sıfırlandığı için ODS import sırasında Product tablosu boştur; import sadece Category/Mapping/Manuel yazar, ürün yolları yazılamaz. Tarama ürünleri oluşturduktan sonra **bir kere** `npx tsx scripts/apply-ods-product-categories.ts "docs/tum_urunler_manuel.ods"` çalıştır; ODS'te (market+ürün adı) yolu olan ürünlerin categoryId'si güncellenir, admin listesi düşer. Sonra `verify-admin-after-scan.ts` ile kontrol et.

**Admin'de çok satır görünmesi:** Listede gördüğün (market + kategori kodu) satırlarının çoğu **Manuel** kategorilerdendir: ODS'te bu (market, kod) çiftleri "Manuel" işaretli olduğu için, o kategorideki tüm ürünler tasarım gereği admin onayına düşer (ürün bazında yol atanır). Yani "3–4 günde bu kadar yeni ürün" değil; mevcut manuel kategorilerin toplam ürün sayısı. ODS'te yolu olup hâlâ admin'de kalanlar için **isim normalizasyonu** kullanılıyor (örn. "1,5 L" = "1.5 L"); sayı hâlâ sıfıra inmezse `apply-ods-product-categories` tekrar çalıştırılabilir.

---

## 10. Tarama: Nereden başlatılır ve sonrası (başka ajana not)

**Cron kullanılmıyor.** Tarama her seferinde **offline script** ile yapılır. Aşağıdaki komut ve akış, taramayı kim başlatırsa başlatsın aynıdır.

### Taramayı başlatma

- **Komut (proje kökünden çalıştırılmalı):**  
  `npx tsx scripts/run-full-scan-offline.ts`
- **Neden proje kökü:** Script, ilerleme durumunu **proje kökündeki** `scrape-status.json` dosyasına yazar. **Tarama izleme sayfası** (`http://localhost:3000/tarama`) bu dosyayı `/api/tarama/status` üzerinden okur. Script farklı bir dizinden çalışırsa dosya başka yerde oluşur ve sayfa güncellenmez; bu yüzden komut **mutlaka proje kökünden** (örn. `cd "proje-yolu"` sonra komut) çalıştırılmalı.
- **Süre:** Yaklaşık 20–25 dakika (market sayısı ve kategori sayısına göre değişir).

### Tarama sırasında ne olur? (sırayla)

1. **İndirme (collectOnly):** Tüm marketler (Migros, A101, Şok vb.) taranır; ürün listesi ve fiyatlar toplanır. Bu aşamada veritabanına yazılmaz. Hata olan kategoriler rapora yazılır.
2. **Yükleme:** Toplanan ürünler Supabase’e yazılır. Her ürün için: **Product** yoksa oluşturulur, varsa güncellenir (isim, görsel, miktar vb.); **categoryId** mevcut ürünlerde **değiştirilmez** (kategori atamaları korunur). Her ürün için yeni bir **Price** satırı eklenir (Product silinmez; bkz. bölüm 7).
3. **Mapping senkronu:** Script otomatik olarak `syncMappingToNullProducts` çalıştırır. **Sadece categoryId=null** olan ürünler için, Mapping tablosundaki (market, kategori kodu) eşleşmesine göre categoryId atanır. Zaten categoryId dolu olan ürünlere dokunulmaz; admin’de bir kez yol verilen ürünler bir daha admin kuyruğuna düşmez.
4. **Alarm kontrolü:** Fiyat alarmları çalıştırılır (upload hatası yoksa).

Bu adımların hiçbirinde **ODS dosyası okunmaz**; kategori yolları tamamen DB’deki Category, MarketCategoryMapping ve MarketCategoryManuel tablolarından gelir.

### Tarama sonrası nerede ne görünür?

- **Tarama izleme:** `http://localhost:3000/tarama` — Son güncelleme tarihi ve aşama (İndirme / Yükleme / Tamamlandı) bu sayfada güncellenir. Sayfayı yenileyerek ilerlemeyi takip edebilirsin.
- **Rapor (metin):** Tarama bittiğinde proje kökünde `scrape-offline-report.txt` oluşur; indirme ve yükleme hataları ile Mapping senkronunda güncellenen ürün sayısı yazılır.
- **Admin:** Sadece **categoryId=null** kalan ürünler (yeni market kodu veya manuel kategoride yeni ürün) admin onay listesinde görünür. Daha önce kategori yolu verilmiş ürünler tekrar listelenmez.

### Kısa özet (ajana)

- Tarama komutu: **proje kökünden** `npx tsx scripts/run-full-scan-offline.ts`.
- İzleme: `/tarama` sayfası aynı kökteki `scrape-status.json`’ı okur; komut bu kökten çalıştırılmalı.
- Sonrası otomatik: İndirme → Yükleme → Mapping senkronu → Alarm. ODS taramada okunmaz; Product silinmez; bir kez atanan kategori yolu korunur.

---

## 11. Alarm: Ürün listeden kalkınca ne olur?

Ana sayfada kullanıcıya **sadece son 24 saatte fiyatı olan** ürünler gösterilir. Bir ürün bu taramada gelmezse (markette yok) 24 saat sonra listeden düşer. **Fiyat alarmları** ise ürünü **son bilinen fiyatıyla** (Price tablosundaki en güncel kayıt) kontrol eder; "son 24 saat" filtresi alarm motorunda yok. Yani: Alarm **bozulmaz**. O ürün ana listede görünmez ama alarmda kalır; bir sonraki taramada o ürün tekrar fiyat alırsa yine alarm değerlendirmesine girer.

---

## 12. Vercel / online beta

- **Admin ve Tarama şifre koruması:** `/admin` ve `/tarama` adreslerine URL ile doğrudan girilemez; her ikisinde de **ADMIN_PASSWORD** ile giriş yapılır. İlk girişte şifre yazılır, aynı tarayıcıda çıkış yapana kadar tekrar sorulmaz. Kullanıcı arayüzünde bu sayfalara link yok; adresi bilen şifreyi girerek erişir. **Çıkış** butonu ile admin oturumu kapatılır.
- **Kullanıcı girişi (username + PIN):** Ana site girişi `/login` sayfasından: kullanıcı adı + PIN. Hesap yoksa aynı formla kayıt olunur; alarmlar ve bildirimler o kullanıcıya özeldir. Session 30 gün (veya **Çıkış** tıklanana kadar). Header’da **Çıkış** ile site oturumu kapatılır.
- **Tarama:** Sadece offline; cron yok. Günlük işlem: `run-full-scan-offline.ts` → toplu Supabase yüklemesi → gerekirse admin’de kategori belirlemesi (bölüm 10).
- **Vercel env:** İsteğe bağlı `SESSION_SECRET` (kullanıcı oturum çerezini imzalamak için; yoksa `ADMIN_PASSWORD` kullanılır).
