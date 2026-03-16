# Market Karşılaştırma — Basit Özet (Teknik Olmayan)

Bu metin, uygulamanın ne yaptığını teknik terim kullanmadan anlatır. Yanlış veya eksik bir şey görürsen söyle; hem bu özet hem teknik rehber güncellenir.

---

## Uygulama ne yapıyor?

Farklı marketlerden (Migros, A101, Şok) ürün ve fiyat bilgilerini topluyor, tek bir yerde listeliyor. Kullanıcı hem arama yapıyor hem kategorilere göre geziyor, hem de “şu fiyatın altına düşerse haber ver” gibi alarmlar kurabiliyor.

---

## Ürünler nasıl geliyor? (Tarama)

- Bir tarama programı sen çalıştırdığında (veya periyodik ayarlanmışsa) devreye giriyor.
- Önce her marketin kategorileri güncelleniyor (ana kategoriler, alt kategoriler).
- Sonra her marketten, her kategorideki ürünler tek tek çekiliyor: isim, fiyat, görsel, kategorisi, gramaj/adet bilgisi. A101’de tüm ürünlerde “nitelik” bilgisi var; tarama bunu da alacak şekilde yapılıyor.
- **A101 için:** Sadece “GeçiciDelist” ve “GrupSpot” niteliğindeki ürünler şüpheli işaretleniyor (fiyatlarıyla birlikte kaydediliyor). Şüpheliler bir sonraki taramada da izleniyor (fiyat veya nitelik değişirse şüpheden çıkabiliyor). Şüpheli ürünler kullanıcıya hiç gösterilmiyor.
- Toplanan ürünler veritabanına yazılıyor. Aynı ürün daha önce varsa güncelleniyor, yoksa yeni kayıt açılıyor.
- Son adımda: Hangi market kategorisi bizim “ana kategorilerimize” denk geliyorsa ürün o kategoriye bağlanıyor. Eşleşmeyenler “kategorisi belli değil” kalıyor; onları admin panelinden elle atıyorsun.

---

## Market kategorileri nasıl keşfediliyor?

- Migros, A101 ve Şok’un kendi sitelerindeki kategori yapıları (ana / alt / yaprak) otomatik keşfediliyor.
- Bu yapılar dosyada tutuluyor; tarama bu listeye göre “hangi kategoriden ürün çekilecek” biliyor.
- Tarama her çalıştığında bu liste güncellenebiliyor ki yeni açılan kategoriler de gelsin.

---

## Ürünler nerede nasıl gösteriliyor?

- **Ana sayfa:** Solda kategoriler (ağaç gibi, açılır kapanır). Ortada/sağda arama kutusu ve ürün kartları. Kategori seçince o kategorideki ürünler, arama yazınca da metne uyan ürünler listeleniyor. Sıralama seçenekleri var (en ucuz, birim fiyata göre vb.).
- **Ürün detay sayfası:** Bir ürüne tıklayınca tek ürün sayfası açılıyor: isim, görsel, en iyi fiyat, birim fiyat ve “Markette gör” ile ilgili marketin sayfasına gidiyorsun. **Önemli:** Aynı ürün farklı marketlerde olsa bile bizde her marketten gelen bilgi ayrı karta yazılıyor; tek kartta “hangi markette ne kadar” listesi yok. Yani marketten gelen her kayıt ayrı ürün kartı.
- Listede ve detayda sadece “güvenilir” gördüğümüz ürünler var; şüpheli diye işaretlenenler sadece admin panelinde görünüyor.

---

## Kategorilerimiz ne?

- Bizim sabit bir kategori ağacımız var (Meyve Sebze, Et Tavuk Balık, Süt Ürünleri, Temel Gıda vb.). Bunlar hem soldaki menüde hem alarm kurarken hem adminde kullanılıyor.
- Marketten gelen “Şok’taki şu kategori” veya “A101’deki şu kod” bizim bu ağaçtaki bir kategoriye eşleniyor. Eşleme tabloları var; bazen yeni gelen bir market kategorisi eşleşmez, o zaman admin “bu market kodu şu bizim kategoriye gitsin” diye ekliyor.

---

## Market kodu + ürün → bizim kategori nasıl oluyor?

- Her marketin kendi kategori kodu / yolu var. Tarama sırasında ürün “hangi market kategorisinden geldi” diye işaretleniyor.
- Veritabanında “şu market + şu market kodu = bizim şu kategori” diye kayıtlar var (mapping). Yeni gelen ürün, mapping’te varsa otomatik bizim bir kategoriye bağlanıyor.
- Bazı market kodları “manuel” listesinde; onlardan gelen ürünler otomatik kategori almıyor, mutlaka admin bir kategori seçiyor.
- Tarama bittikten sonra bir adım daha var: Kategorisi hâlâ boş kalan ürünler, son fiyat kaydındaki market koduyla tekrar mapping’e bakılıp dolduruluyor. Yine eşleşmezse admin panelinde “bekleyen eşleşmeler”e düşüyor.

---

## Şüpheli ürünler (A101 niteliğe göre)

- A101’deki **tüm** ürünlerde “nitelik” (nitelikAdi) bilgisi var. Taramayı bu bilgiyi alacak şekilde yapıyoruz. Sadece **GeçiciDelist** ve **GrupSpot** niteliğindekileri şüpheli işaretliyoruz; geri kalanları normal gösteriyoruz.
- Şüpheli işaretleme **sadece** bu nitelik grubuna göre yapılıyor. Eski sistemdeki gibi “Şok/Migros’ta fiyat %80 aşağıdaysa şüpheli” gibi bir kural **yok**; sadece nitelikAdi’na göre.
- Şüpheliler listelenmez; sadece admin panelinde görünüyor. Admin “şüpheden çıkar” derse ürün tekrar normal listeye girebiliyor.
- Sonraki taramada: Aynı ürünün fiyatı değişmişse veya niteliği artık GeçiciDelist/GrupSpot değilse sistem onu otomatik şüpheden çıkarabiliyor.

---

## Alarmlar nasıl çalışıyor?

- Kullanıcı istediği kadar **kategori** ve istediği kadar **tekil ürün** seçebiliyor; hepsi tek alarmda toplanıyor. Sayfada sol/sağ gibi ayrılmış: kategoriler ve ürünler seçiliyor.
- Alarm ismi (örn. “Kaşar peyniri”) ve “şu birim fiyatın (örn. 300 ₺/kg) altına düşerse haber ver” hedefi veriliyor.
- Seçimler yapıldıktan sonra “onayla” ile ürün listesini gösterip gizleyebildiğin, dahil/hariç tutabildiğin ve alarm ayarlarını (hedef fiyat, birim vb.) yapıp kaydettiğin sayfaya geçiliyor. **Eski alarm sistemleriyle karıştırılmamalı; her zaman en güncel alarm akışı kullanılmalı.**
- **Etiket sistemi yok.** Daha önce etiket sistemi kaldırıldı; alarmlar kategori + tekil ürün seçimine göre çalışıyor, etiket filtresi kullanılmıyor.
- Tarama bittikten sonra alarm kontrolü çalışıyor: Seçilen kategorilerdeki ve dahil edilen tekil ürünlerin güncel birim fiyatına bakılıyor. Hedefin altındakiler için bildirim oluşturuluyor.
- Yeni keşfedilen uygun ürünler önce “onay bekleyen” listesine düşebiliyor; kullanıcı alarm sayfasından “alarma ekle” veya “hariç tut” diyebiliyor.
- Bildirimde ürün varsa tıklanınca ürün detay sayfasına gidiyorsun; istersen “sepete ekle” butonuyla sepete ekleniyor (sepette sadece bizim kaydettiğimiz bilgilerle listeleniyor, gerçek alışveriş markette yapılıyor).

---

## Ana sayfadaki arama nasıl?

- Üstte veya ortada arama kutusu var. Yazdığın kelime(ler) ürün adında aranıyor. **Ürün adında geçen harfleri sıralama olmadan da arayabiliyorsun:** Örneğin “Torku Tam Yağlı Süt” için “tor t yağl s” yazsan bile bu ürün arama adayları arasında çıkabiliyor.
- **Kategori ile aramanın ilişkisi:** Kategoriye tıklarsan arama metni temizleniyor (kategori seçimi aramayı ezer). Arama yaparsan (kelime yazıp ara’ya basarsan) seçili kategori temizleniyor (arama kategoriyi ezer). **İstisna:** Arama kutusunun yanındaki “Sadece bu kategoride ara” seçeneği işaretliyken arama yaparsan, seçili kategori korunur ve arama sadece o kategorinin içinde yapılır.
- Sadece kategori seçip kelime yazmadan da o kategorideki tüm ürünler listelenebiliyor.
- Sıralama: Fiyata göre, birim fiyata göre en ucuz vb. seçenekler var.

---

## Sepet ve takip

- Sepet: Ürün kartından veya bildirimden “sepete ekle” denince ürün sepete ekleniyor. Sepet sayfasında listeleniyor; miktar artırıp azaltabiliyorsun. Gerçek ödeme bizde yok; kullanıcı markete gidip oradan alıyor.
- Takip: Bazı ürünleri “takip et” (yıldız) ile işaretleyebiliyorsun; “takip edilenler” sayfasında toplu görüyorsun.

---

## Admin panelinde neler var?

- **Giriş:** Şifre/PIN ile admin girişi.
- **Bekleyen eşleşmeler:** Kategorisi belli olmayan ürünlerin hangi market + market koduyla geldiği gruplar halinde listeleniyor. Admin “bu grup şu bizim kategoriye gitsin” seçip kaydediyor; bir sonraki taramada veya senkronda o ürünler o kategoriye bağlanıyor.
- **Şüpheli ürünler:** A101’de sadece GeçiciDelist ve GrupSpot niteliğine göre şüpheli işaretlenen ürünler. Listelenir; “şüpheden çıkar” ile normale alınabiliyor. (Eski “fiyat %80 aşağı” kuralı kullanılmıyor.)
- **Kategori düzeltme:** Tek tek ürünlere “bu ürün şu kategoriye ait” diye elle kategori atayabiliyorsun. Market + kategori kodu veya ürün adına göre arama yapılabiliyor.
- İsteğe bağlı debug / kategorisiz ürün listeleri de olabilir; hepsi admin tarafında, normal kullanıcı görmez.

---

## Birim fiyat kuralları

- Ürün adından gramaj / hacim / adet çıkarılıyor (200 g, 1 L, 10’lu yumurta vb.). Buna göre “₺/kg”, “₺/L” veya “₺/adet” hesaplanıyor.
- Listede ve detayda bu birim fiyat gösteriliyor; “birim fiyata göre sırala” da buna göre çalışıyor.
- Alarmdaki “hedef fiyat” da birim fiyat cinsinden (örn. 300 ₺/kg altına düşünce haber ver).

---

## Özet

- **Tarama:** Marketlerin kategorileri keşfediliyor, ürünler (A101’de nitelik bilgisiyle) çekilip veritabanına yazılıyor. GeçiciDelist ve GrupSpot şüpheli işaretlenip kullanıcıya gösterilmiyor; sonra mapping ile bizim kategoriye bağlanıyor, eşleşmeyenler admin’e düşüyor.
- **Ana sayfa:** Kategori (ve isteğe bağlı “sadece bu kategoride ara” + arama) ile ürün listesi; arama kelime sırası olmadan da eşleşebiliyor. Ürüne tıklanınca detay ve “markette gör” linki. Her market kaydı ayrı ürün kartı.
- **Alarm:** İstediği kadar kategori + istediği kadar tekil ürün; onay sayfasında dahil/hariç ve ayarlar; etiket yok; hedef birim fiyat altına düşünce bildirim.
- **Admin:** Bekleyen kategori eşleşmeleri, şüpheli ürünler (sadece nitelikAdi’na göre), tek tek kategori düzeltme.
- **Sepet ve takip:** Sadece listeleme / hatırlatma; satın alma markette.
