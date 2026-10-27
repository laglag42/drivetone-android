# DRIVETONE V7 — Android Car Audio Studio

Android için araç ses kontrolü ve yerel müzik uygulaması. APK derlemesi GitHub Actions üzerinde otomatik yapılır.

## V7'de çalışan altyapılar

- **Kalıcı müzik kütüphanesi:** Android Storage Access Framework (ACTION_OPEN_DOCUMENT) ile kullanıcının seçtiği müzik URI'leri ve kalıcı okuma izinleri saklanır. Erişim iptal edilirse dosyanın yeniden seçilmesi gerekebilir.
- **Arka planda müzik:** Media3 ExoPlayer + MediaSessionService. Yerel müzik ses odağına saygılı biçimde çalar; desteklenen telefonlarda kilit ekranı/bildirim/Bluetooth medya tuşlarıyla kontrol edilir.
- **İki farklı oynatıcı:** Android Native oynatıcı arka plan oynatma için; eski Web Audio oynatıcı 28 bant EQ için. **Native Media3 ses zincirine henüz 28 bant EQ bağlanmadı.** İkisi aynı anda çalmasın diye birini başlatınca diğeri duraklatılır.
- **Ses çıkışı tanılaması:** Android 13+ getAudioDevicesForAttributes ile medya için tahmin edilen çıkışı gösterir. Bu, FOR-X DSP bağlantısı ya da gerçek teybe gönderilen sesin kesin teyidi değildir.
- **Ayar yedeği:** EQ, favoriler ve uygulama tercihlerini JSON dosyasına yedekleme/geri yükleme. Müzik dosyalarının kendisi ve Android URI izinleri yedeğe dahil değildir.

## Daha önceki özellikler

V5: Karıştır, tekrar, favoriler, arama, oynatma hızı, uyku zamanlayıcısı, EQ A/B, profil aktarımı ve şarkı bazlı EQ.

V6: Frekans temelli yerel otomatik EQ önerisi, tepe koruması, etkileşimli araç önizlemesi, sürüş modu, dokunsal ses düğmesi, kaynak profilleri, test tonları ve güvenli başlangıç seviyesi.

## Dürüst teknik sınırlar

- FOR-X XQ-7350/X-7350 kontrol protokolü doğrulanmadığı için bass/fader/subwoofer ayarları **teybe gönderilemiyor**.
- Spotify ve YouTube'un ses akışına sistem genelinde EQ uygulanmıyor. Yalnızca medya oturumu bilgisi ve izin verilen temel kontroller erişilebilir.
- Bu repo otomatik **debug** APK üretir. GitHub iş akışlarında farklı imzalama anahtarı kullanılması mevcut uygulamanın üzerine güncelleme kurulmasını engelleyebilir; kullanıcı verileri etkilenebilir.
- Android SDK sürümleri ve üreticilerin uygulamaları farklı davranabilir. Gerçek cihazda test gereklidir.

## APK oluşturma

GitHub > Actions > `Build DRIVETONE APK` > en son başarılı çalıştırma > `DRIVETONE-debug-apk`.
İndirdiğiniz zip içinden `app-debug.apk` çıkar. Kaynak kod: `app/`.

## Android dokümantasyonu

- [MediaSessionService ile arka plan oynatma](https://developer.android.com/media/media3/session/background-playback)
- [ACTION_OPEN_DOCUMENT ve kalıcı URI izinleri](https://developer.android.com/training/data-storage/shared/documents-files)
- [AudioManager ses yolu API](https://developer.android.com/reference/android/media/AudioManager)
