# Rakip Analizi ve AntiGravity Değer Önerisi

Bu doküman, SubVysion gibi mevcut otonom GPR tabanlı haritalama sistemlerinin zayıf yönlerini ve AntiGravity-Mapper projesinin bunlara karşı konumlandırmasını içerir.

## SubVysion ve Benzeri Sistemlerin Limitleri

### 1. Yüksek Donanım Maliyeti ve Ölçeklenme Bariyeri
* **Eksi:** Kendi ürettikleri özel otonom rover filolarına (donanıma) bağımlıdırlar. Fiziksel bir robot üretmek, bakımını yapmak ve şantiyelere sevk etmek son derece yüksek maliyetlidir (Capital Intensive).
* **Etkisi:** Şirket büyürken tüm dünyaya veya yüzlerce şehre aynı anda otonom araç gönderemez; bu da küresel ölçeklenmeyi yavaşlatır. [[1]](https://www.ycombinator.com/companies/subvysion#:~:text=We've%20built%20a%20fleet%20of,radar%20and%20other%20sensors%20that)

### 2. Yoğun Trafik ve Zorlu Coğrafi Kısıtlar
* **Eksi:** GPR (Yere Nüfuz Eden Radar) taşıyan roverların çalışabilmesi için düz ve açık bir zemin gerekir.
* **Etkisi:** İstanbul, Samsun gibi yoğun trafiğe sahip, kaldırımları dar, engebeli, kazılmış veya çamurlu sokaklarda otonom bir robotun kendi başına haritalama yapması neredeyse imkansızdır. Robot sürekli park etmiş araçlara veya yayalara takılır.

### 3. Sadece Radara (GPR) Güvenmenin Teknik Limitleri
* **Eksi:** Yere nüfuz eden radarlar her toprak türünde aynı performansı vermez. Özellikle yüksek killi topraklarda veya su seviyesi yüksek sulak zeminlerde radar sinyalleri derinlere inemez ve körelir.
* **Etkisi:** Altyapının derinliğini ve boru türlerini (örn. plastik/PVC ile metal) ayırt etmekte veri kaybı yaşarlar. Sadece radara güvenmek büyük kör noktalar yaratır.

### 4. Aktif Güvenlik Katmanının Olmaması (Statik Harita)
* **Eksi:** Sistemi alanı tarar, veriyi bulutta işler ve operatöre 3D bir statik sahne haritası sunar.
* **Etkisi:** Kazı anında gerçek zamanlı (real-time) bir müdahale veya alarm sistemi içermez. Operatör haritaya bakmayı unutursa veya harita güncel değilse, iş makinesi boruyu patlatabilir. Aktif koruma sağlamaz.

### 5. Yasal ve Bürokratik Entegrasyon Eksikliği
* **Eksi:** Genellikle ABD pazarındaki "811" çağrı sistemine göre tasarlanmışlardır.
* **Etkisi:** Diğer ülkelerdeki yerel yönetimlerin (belediyeler, İSKİ, SASKİ vb.) dağınık CAD şemalarını ve geçmiş kazı arşivlerini sisteme dahil edecek bir veri konsolidasyon altyapısı sunmazlar.
