
# MarketFiyati.org.tr Analiz Raporu

## 1. Genel Bakış ve Sahiplik
*   **Devlet Kurumu Mu?:** **HAYIR.**
    *   Alan adı `.org.tr` (Vakıf/Dernek veya Organizasyon), `.gov.tr` (Devlet) değil.
    *   Kaynak kodlarda "Bakanlık", "Müdürlük" veya resmi logo bulunamadı.
    *   Teknik altyapı (Angular SPA, Google Analytics, Yandex Metrica) standart özel sektör/girişim yapısında. Devlet sitelerinde (örn. Ticaret Bakanlığı Hal Kayıt Sistemi) genellikle daha eski veya kurumsal .NET altyapıları ve sunucuları (örn. `turkiye.gov.tr` SSO) kullanılır.
    *   **Tahmin:** Kişisel bir girişim veya bir dernek projesi.

## 2. Veri Kaynağı ve Pazar Kapsamı
Sitenin JavaScript kodlarını incelediğimizde şu marketlerin tanımlı olduğunu kesinleştirdik:
1.  **Şok** (`id: 1`)
2.  **Tarım Kredi** (`id: 2`)
3.  **CarrefourSA** (`id: 3`)
4.  **A101** (`id: 4`)
5.  **Migros** (`id: 5`)
6.  **BİM** (`id: 6`) ✅ **(EVET, BİM VAR!)**

Bu çok önemli bir bilgi. Demek ki BİM verisi dijital olarak bir yerlerden çekilebiliyor veya manuel de olsa giriliyor. Bizim için bir referans noktası olabilir.

## 3. Teknik Altyapı
*   **Frontend:** Angular (SPA - Single Page Application). Site açıldığında bomboştur, veriler sonradan API'den gelir. Bu yüzden klasik botlar (Python requests, curl) burayı boş görür.
*   **Backend API:** `https://api.marketfiyati.org.tr/api/v2`
*   **Koruma (WAF):** Sıkı bir güvenlik duvarı var.
    *   API'ye dışarıdan (tarayıcı dışı) istek attığımızda **"418 I'm a teapot"** veya IP bloklama sayfası döndürüyor.
    *   Bu, verilerini koruduklarını ve scrapinge karşı önlem aldıklarını gösteriyor.
*   **Mobil Uygulama:** Huawei AppGallery linki mevcut. Muhtemelen mobil öncelikli bir yapıları var.

## 4. UX/UI ve Özellikler (Kod Analizinden Çıkarımlar)
*   **Arama Mantığı:** `searchAlternative` isimli özel bir endpoint kullanıyorlar. Muhtemelen "Süt" yazınca içinde süt geçen en ucuz ürünleri ve alternatif markaları (Muadil) getiriyor.
*   **Sepet:** Kodlarda `getGroceryStoreList` gibi fonksiyonlar var. Muhtemelen sanal bir sepet oluşturup "Bu sepeti X marketten alırsan şu kadar, Y'den alırsan bu kadar" analizi yapıyorlar (Bizim Süper Sepet projesi gibi).

## 5. Bizim İçin Fırsatlar & Riskler
*   **Fırsat (BİM):** En büyük kazanım, BİM verisinin varlığının kanıtlanmasıdır. Eğer onlar yapabiliyorsa, biz de (manuel giriş, fiş tarama veya içeriden sızan API) bir yolunu bulabiliriz. Veya bu siteyi "Kaynak" olarak kullanıp (Proxy/Browser Emulation ile) veriyi buradan çekmeyi deneyebiliriz.
*   **Risk:** API'leri çok korunaklı. Buradan veri çekmek sürdürülebilir olmayabilir (Her gün IP blok yiyebiliriz).
*   **Eksik:** "Akıllı Sepet" (Sizin bahsettiğiniz). Kodlarda çok karmaşık bir optimizasyon algoritması (Knapsack promlemi vb.) görmedim. Muhtemelen sadece "Sepet Toplamı" kıyaslıyorlar. Bizim yapacağımız "Bunu A101'den, Şunu Şok'tan al" önerisi burada yok gibi.

## Özet
Çok temiz, modern (Angular) ama kapalı bir kutu.
Devlet sitesi değil.
**BİM verisi var.**
Veri çekmek zor ama imkansız değil (Advanced Scraping gerekir).
