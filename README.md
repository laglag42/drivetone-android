# DRIVETONE V8 — Android Car Audio Studio

Android uygulaması: GitHub Actions ile derlenen `DRIVETONE-V8.apk` kurulum dosyası GitHub Releases bölümünden indirilebilir.

## V8 yenilikleri
1. **Arka plan oynatıcı EQ:** Media3 ses oturumuna bağlanan Android `audiofx.Equalizer`; ekranda 28 kontrol noktası desteklenir ama işlenen **gerçek donanım bandı cihazın Android EQ motorunun bildirdiği sayı kadardır**. V8 ekranındaki “Android EQ'ya uygula” tuşu üzerinden açılır. Harici Spotify/YouTube akışını etkilemez.
2. **FOR-X Connection Lab:** Bluetooth cihaz görünürlüğü ve Android'in tahmini medya çıkışını gösterir; gerçek FOR-X X-7350 kontrol protokolü bilinmiyor. **Teybe komut GÖNDERMEZ.**
3. **Smart EQ 2.0:** Yerel müzik için pop/rock/bass/vokal/gece profil önerileri ve V6'nın frekans temelli analizi; bu özellikler makine öğrenmesi modeli değildir.
4. **Car Studio 2.0:** Kaydırılabilir iki eksenli sanal ses odağı; yatay eksen yerel stereo balance ayarına gider. Ön/arka ayarı sadece simülasyondur; araç teybi fader'ına erişmez.
5. **Ultra Drive & Voice:** Büyük kontrol yüzeyi ve Android sisteminin ses tanıma etkinliği ile sınırlı Türkçe sesli komutlar. Dikkati yoldan ayırmadan yalnızca güvenli durumlarda kullanın.
6. **Mikrofon ile yaklaşık analiz:** Kullanıcının izin verdiği anda mikrofon verisinden üç kaba frekans bölgesi hesaplar; profesyonel kalibrasyon, SPL veya otomatik hoparlör düzeltme değildir.
7. **Smart Library:** Media3 arka plan kütüphanesine hızlı erişim ve yenileme, V5 şarkı araması/favoriler/tekrar.
8. **Bağlantı profilleri:** V6'nın kaynak profilleri ve güvenli başlangıç seviyesi korunur; tüm Bluetooth olaylarında otomatik tetikleme garanti edilmez.
9. **V8 arayüz ve verimlilik:** Sürüş kontrolü, geliştirilmiş ayar panelleri, azaltılmış hareket modu ve tema seçimi.
10. **Audio Diagnostics:** Android sürümü, model, batarya, telefon medya seviyesi, Media3 oynatıcı durumu ve EQ motoru/gerçek bant sayısı için yerel tanılama raporu.

## Teknik sınırlar
- İki oynatma yolumuz vardır: yerel `Web Audio` 28 bant DSP, **Media3** arka planda çalma ve Android cihazın desteklediği bant sayısı kadar `audiofx.Equalizer`. **Tam 28 bant DSP'nin Media3'e birebir taşındığı iddia edilemez.**
- Android'in ses efektleri bazı telefonlarda devre dışı olabilir veya kısıtlı bant sayısı destekleyebilir. Çalışma durumunu V8 EQ panelinden inceleyin.
- FOR-X marka teyp **Bluetooth ses bağlantısı** üzerinden otomatik olarak DSP komutlarını kabul etmez; protokol/APP bilgisi ve donanım testi gereklidir.
- Spotify, YouTube ve YouTube Music akışları uygulama içinden yeniden işlenmez. Medya oturumu izinleriyle temel kontrol ve başlık görüntüleme mümkündür.
- Mikrofon işlenmesi yalnızca kullanıcı izin verdiğinde yapılır; arka planda kayıt yoktur.
- APK derleme ve statik testler gerçek Android telefon testi **yerine geçmez**. İmzalanmamış release değil, debug APK oluşturulur.
- Farklı GitHub Actions çalıştırmalarının debug imzası farklı olabilir. Önce ayarlarınızı yedekleyin; güncelleme kurulamıyorsa eski uygulamayı kaldırmanız veri kaybına yol açabilir.

## APK indirme
GitHub Releases > `v8.0.0-debug` > `DRIVETONE-V8.apk`. Derleme sürümü Android 8+ (minSdk 26).
