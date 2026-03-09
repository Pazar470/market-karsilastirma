# Mobil / UX sorunlar ve çözümler

Kısa referans tablosu. Agent modunda tek seferde uygulanacak, sonra Vercel deploy.

---

| # | Sorun | Çözüm |
|---|--------|--------|
| 1 | Genel: mobil kullanıcı dostu değil, çok kaydırma, performans hissi kötü | Mobil-first layout; liste/grid kompakt; gereksiz boşluk azalt. |
| 2 | Mobil anasayfada alarm sayfasına geçiş yok (PC'de var) | Mobil header/nav’a “Fiyat Alarmları” / alarm sayfası linki ekle. |
| 3 | Alarm oluştur ekranında “Alarm Oluştur” butonu sepet FAB’ının arkasında kalıyor | FAB’ı sayfa içeriğinin altında bırak veya bu sayfada gizle / padding ile “Alarm Oluştur”a çakışmayı kaldır. |
| 4 | Yeni kurulan alarmda “40 yeni ürün onay bekliyor” kafa karıştırıyor (henüz tarama yok) | Sadece gerçekten onay bekleyen ürün varsa göster; 0 ise bu blok gizlensin veya “Henüz ürün yok” gibi net metin. |
| 5 | Mobilde bildirimler paneli solda kalıyor, tam okunmuyor | Panel genişliği tam ekran / drawer; mobilde sağdan veya alttan açılacak şekilde konumla. |
| 6 | Bildirime tıklayınca ürüne gitmiyor | Bildirim tıklanınca ilgili ürün detay sayfasına yönlendir. |
| 7 | Tek ürün koca sayfayı kaplıyor (ürün listesi) | Ürünleri 2 sütun grid, küçük kartlar (A101 örneği gibi); sayfa başına daha çok ürün. |
| 8 | Kategori/alarm sayfasında uzun bilgilendirme metni | Kısa metin: kategori bazlı alarm; ürünler market sitelerinden; fiyat/ürün uyuşmazlığında sorumluluk kabul etmiyoruz. |
| 9 | Ürün ara placeholder: “(örn: Kaşar, Süt)” | Placeholder’ı sadeleştir: “Ürün ara…” veya “Ara…” (örnek kısmı kaldır). |
| 10 | Ana sayfada “Kategoriler:” altındaki tag’ler (pill’ler) | Şimdilik bu tag’leri kaldır. |
| 11 | Ana sayfada kategoriler kazület gibi, çok yer kaplıyor | Kategorileri yanda açılır/kapanır menü (drawer/sidebar); kategori seçilince tam sayfa küçük ürün grid’i. |
| 12 | “Diğer” kategorisi | “Diğer”i her zaman en alta taşı; alfabetik sıradan ayrı. |
| 13 | Ürün kartlarında market bilgisi | Ürün kartında market adı + mümkünse küçük market logosu (referans görsel 2). |

---

## Referanslar (rehber, zorunlu değil)

- **A101 ürün listesi:** 2 sütun grid, kompakt kart, yatay kategori filtreleri — benzer kompaktlık hedeflenebilir.
- **Market logoları:** Ürün altında küçük market logosu kullanımı değerlendirilebilir.

---

*Son güncelleme: toplu mobil iyileştirme öncesi.*
