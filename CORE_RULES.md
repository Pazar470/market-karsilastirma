# 🔴 CORE RULES — Market Karşılaştırma

> Tüm geliştirme kararları bu belgede yazan kurallara göre alınır. Hiçbir değişiklik bu kurallara aykırı olamaz.

---

## 1. Uygulamanın Amacı

**Birincil hedef:** Kullanıcının **ihtiyaç bazlı** alarm kurabilmesi. Ürün/marka takip değil, kategori + filtre tabanlı alarm.
> "Salça alacağım, en ucuzu hangisi olursa bildir." ✅
> "Tukaş Domates Salçası 700g takip et." ❌ (bu biz değiliz)

**İkincil hedef:** Tüm marketlerdeki **tüm ürünler** (iğneden ipliğe) uygulamada doğru fiyatla ve doğru kategoride görünür olmalıdır. Hiçbir ürün dışarıda bırakılmaz.

### Kategorizasyon ve fiyat alarmı vizyonu
- **İki basamaklı kategorizasyon:** Her ürün önce **yaprak kategori**mize eşlenir (örn. Kaşar Peyniri, Tam Yağlı Süt); yaprak da **ana kategori**mize bağlanır (16 ana kategoriden biri). Üç marketteki aynı tür ürünler (kaşarlar) tek yaprak altında toplanır.
- **Tag’ler:** Ürün tipini tanımlar: tam yağlı, yarım yağlı, tost peyniri, eski kaşar, taze kaşar vb. Alarm sayfasında filtre ve birim fiyat karşılaştırması için kullanılır.
- **Fiyat alarmı sayfası:** Aynı yaprak kategorideki ürünler **tüm marketler** bazında tek sayfada listelenir; birim fiyat hesaplanmış olur. Kullanıcı birim fiyat hedefi girer (örn. 40 TL/litre altı); seen/unseen veya tag ile istediği ürünleri seçer; seçtiği ürünlerden herhangi biri hedefe düşünce bildirim alır.
- **Bizi ayıran özellik:** Diğer uygulamalar tek ürün / tek marka için alarm kurdurur; biz **yaprak kategori bazında** aynı tür tüm ürünlere alarm kurma imkânı sunarız.

---

## 2. Kategori Mimarisi

### Temel Kural
- Kategori **iki basamaklıdır**: **Ana kategori** (16 sabit) + **Yaprak** (kanonik alt: Kaşar Peyniri, Tam Yağlı Süt vb.). Yaprak = liste/alarm sayfası birimi; ana = navigasyon.
- Marketin kendi derin ağacı (onlarca dal) **bizim mimari değildir**; marketten gelen ham kategori adı, mapper ile **bizim ana + yaprak** değerlerimize dönüştürülür. Detay: **docs/KATEGORIZASYON-MODELI.md**.
- Her market ürünü, o marketin yaprak ismi üzerinden **bizim ana + yaprak (canonical)** değerlerine eşlenir.
- Eşleştirmesi yapılamayan ürün bile sisteme girer; ana = "Diğer", yaprak = ham isim. **Hiçbir ürün reddedilmez.**

### Kategori → Tag Mantığı
- **Kategori = Ne tür ürün?** (Meyve, Et, Süt Ürünleri, Temizlik...)
- **Tag = Nasıl, hangisi?** (karpuz, çilek / kaşar, beyaz peynir / tam yağlı, laktozsuz...)

Kullanıcı alarm akışı:
> Kategori: `Meyve` + Tag: `karpuz` → sadece karpuzlar gelir, "karpuzlu soda" gelmez (çünkü o İçecek kategorisinde)

### Kirlilik Sorunu Nasıl Çözülüyor?
- "Karpuzlu soda" markette İçecek kategorisinde → bizde İçecek kategorisine çekilir.
- "Karpuz" markette Meyve kategorisinde → bizde Meyve kategorisine çekilir.
- Kategori mapping doğru yapıldıkça yanlış ürün asla yanlış kategoriye düşmez.

### Normalizasyon Zorunluluğu
Her marketin ham **yaprak ismi** (kategori adı) mapper ile **ana + yaprak (canonical)** değerlerimize dönüştürülür. Tablo örnekte **ana kategori** gösterilir; yaprak (tags[0]) aynı mapper’da belirlenir. Tek referans: **docs/KATEGORIZASYON-MODELI.md**.

| Market | Ham yaprak ismi / kod | Bizim ana kategori |
|--------|------------------------|---------------------|
| Migros | slug / Meyve | Meyve & Sebze |
| A101 | C0101 / Meyve | Meyve & Sebze |
| Şok | meyve-c-xxx / Meyve | Meyve & Sebze |
| Migros | kasar-peyniri / Kaşar Peyniri | Süt Ürünleri |
| A101 | C0512 / Kaşar Peyniri | Süt Ürünleri |

### 16 Ana Kategori (Kesin Liste)
1. Meyve & Sebze
2. Et, Tavuk & Balık
3. Süt Ürünleri
4. Fırın & Pastane
5. Temel Gıda
6. Atıştırmalık
7. İçecek
8. Hazır Yemek & Dondurulmuş
9. Temizlik
10. Kişisel Bakım & Kozmetik
11. Kağıt Ürünleri
12. Anne & Bebek
13. Ev & Yaşam
14. Elektronik
15. Evcil Hayvan
16. Çiçek

---

## 3. Tag Sistemi

- Ürün adı ve kategori adından **otomatik keyword çıkarımı** yapılır.
- Her ana kategori için önceden tanımlanmış anahtar kelime listesi bulunur.
- Örnekler:
  - **Meyve**: `karpuz`, `çilek`, `muz`, `portakal`, `elma`, `armut`...
  - **Süt Ürünleri**: `kaşar`, `beyaz peynir`, `süzme`, `tam yağlı`, `yarım yağlı`, `laktozsuz`, `uht`...
  - **Salça**: `domates`, `biber`, `acı`, `tatlı`...

---

## 4. Alarm Sistemi

### Alarm Kurma Akışı
1. Kullanıcı ana kategori seçer → tag filtreler → filtreli ürün listesi gelir
2. Her ürün **Seen** (alarma dahil) veya **Unseen** (hariç) yapılır
3. **Tümünü Seen / Unseen** toplu seçim butonu zorunludur
4. Alarm onaylanır → sadece Seen ürünler aktif alarma dahildir; Unseen'ler grilenmiş listede kalır

### Alarm Yönetimi
- Alarm kurulduktan sonra **her şey istenildiği zaman değiştirilebilir** (fiyat, ürünler, taglar)
- Ana sayfada bulunan ürün → **tek tuşla mevcut alarma eklenebilir**

### Alarm Durumları
| Durum | Açıklama |
|-------|----------|
| Aktif | Fiyat takibi devam ediyor |
| Duraklatılmış | Geçici kapalı, silinmemiş |
| Arşivlenmiş | Listeden kalkar; 1-2 tıkla yeniden kurulabilir veya kalıcı silinebilir |

### Akıllı Öneri Bildirimi
- Market yeni ürün eklediğinde sistem, ürünün aktif alarmlara uyuşma yüzdesini hesaplar
- Yüksek uyuşmada kullanıcıya bildirim:
  > *"[Ürün], '[Alarm]' alarmınızla %85 uyuşuyor. Eklemek ister misiniz?"*

---

## 5. Deployment Kuralı

**Önce localhost'ta test et, her şey sağlamsa deploy et.** Her sprint sonu deploy yapılır.

---

> Bu belge her yeni AI oturumunun başında okunmalıdır.
