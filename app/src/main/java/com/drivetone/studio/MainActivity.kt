package com.drivetone.studio

import android.app.Activity
import android.Manifest
import android.content.pm.PackageManager
import android.webkit.PermissionRequest
import android.speech.RecognizerIntent
import android.content.ComponentName
import android.content.ContentValues
import android.content.Intent
import android.graphics.Color
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.net.Uri
import android.os.Bundle
import androidx.media3.session.MediaController as NativeController
import androidx.media3.session.SessionToken
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata as NativeMetadata
import com.google.common.util.concurrent.ListenableFuture
import com.google.common.util.concurrent.MoreExecutors
import android.os.Handler
import android.os.Looper
import android.view.HapticFeedbackConstants
import android.provider.MediaStore
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject

class MainActivity : Activity() {
    private lateinit var web: WebView
    private lateinit var nativeLibrary: NativeMusicLibrary
    private var nativeFuture: ListenableFuture<NativeController>? = null
    private var nativeController: NativeController? = null
    private lateinit var audio: AudioManager
    private lateinit var loader: WebViewAssetLoader
    private var chooser: ValueCallback<Array<Uri>>? = null
    private var fileChooserIsAudio = false
    @Volatile private var playbackSnapshot: String = "{\"ready\":false}"
    @Volatile private var nativeQueueSnapshot: String = "[]"
    @Volatile private var fullScreenPlayerV11 = false
    private val fileRequest = 5274
    private val voiceRequest = 5275
    private val microphoneRequest = 5276
    @Volatile private var lastSharedMedia = "{}"
    private var pendingMicrophone: PermissionRequest? = null
    private val handler = Handler(Looper.getMainLooper())
    private var previousVolume = -1
    private var previousDevice = ""
    @Volatile private var activeTab = "home"
    private val monitor = object : Runnable {
        override fun run() {
            if (!isFinishing && ::web.isInitialized) {
                playbackSnapshot = getNativePlaybackSnapshot()
                updateQueueSnapshot()
                val v = getVolume()
                if (v != previousVolume) {
                    previousVolume = v
                    executeJs("window.DRIVETONE&&window.DRIVETONE.onVolumeChanged($v)")
                }
                val b = getBluetoothDevice()
                if (b != previousDevice) {
                    previousDevice = b
                    executeJs("window.DRIVETONE&&window.DRIVETONE.onBluetoothOutput(${JSONObject.quote(b)})")
                }
                handler.postDelayed(this, 1600)
            }
        }
    }

    @Suppress("DEPRECATION")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(8,13,20)
        window.navigationBarColor = Color.rgb(8,13,20)
        window.decorView.systemUiVisibility = 0
        audio = getSystemService(AUDIO_SERVICE) as AudioManager
        nativeLibrary = NativeMusicLibrary(this)
        val token = SessionToken(this, ComponentName(this, PlaybackService::class.java))
        nativeFuture = NativeController.Builder(this, token).buildAsync()
        nativeFuture?.addListener({
            try {
                nativeController = nativeFuture?.get()
                restorePlaybackOptions()
                updateQueueSnapshot()
                executeJs("window.DTV7&&window.DTV7.nativeReady()")
            }
            catch (_: Exception) { executeJs("window.DTV7&&window.DTV7.nativeError()") }
        }, MoreExecutors.directExecutor())
        volumeControlStream = AudioManager.STREAM_MUSIC
        loader = WebViewAssetLoader.Builder().addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this)).build()
        web = WebView(this)
        web.setBackgroundColor(Color.rgb(247,247,245))
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.settings.allowFileAccess = false
        web.settings.allowContentAccess = true
        web.settings.mediaPlaybackRequiresUserGesture = true
        web.settings.setSupportZoom(false)
        web.isVerticalScrollBarEnabled = false
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?): WebResourceResponse? =
                request?.url?.let { loader.shouldInterceptRequest(it) }
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val uri = request?.url ?: return true
                if (uri.host == "appassets.androidplatform.net" && uri.scheme == "https") return false
                if (uri.scheme !in setOf("https", "http")) return true
                return try { startActivity(Intent(Intent.ACTION_VIEW, uri)); true } catch (_: Exception) { true }
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest?) {
                if(request==null)return
                runOnUiThread {
                    if(request.origin?.host!="appassets.androidplatform.net" ||
                        !request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE))request.deny()
                    else if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED)
                        request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
                    else {
                        pendingMicrophone?.deny()
                        pendingMicrophone=request
                        requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO),microphoneRequest)
                    }
                }
            }
            override fun onPermissionRequestCanceled(request: PermissionRequest?) {
                if(pendingMicrophone===request)pendingMicrophone=null
            }
            override fun onShowFileChooser(view: WebView?, callback: ValueCallback<Array<Uri>>?, params: FileChooserParams?): Boolean {
                chooser?.onReceiveValue(null)
                chooser = callback
                fileChooserIsAudio = params?.acceptTypes?.none { it.contains("json", ignoreCase = true) } != false
                val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = if (params?.acceptTypes?.any { it.contains("json", true) } == true) "application/json" else "audio/*"
                    putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                return try { startActivityForResult(intent, fileRequest); true }
                       catch (_: Exception) { chooser?.onReceiveValue(null); chooser = null; false }
            }
        }
        web.addJavascriptInterface(Bridge(), "AndroidBridge")
        setContentView(web)
        web.loadUrl("https://appassets.androidplatform.net/assets/index.html")
        receiveExplicitMediaShare(intent)
    }
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        receiveExplicitMediaShare(intent)
    }

    private fun receiveExplicitMediaShare(incoming: Intent?) {
        if (incoming?.action != Intent.ACTION_SEND || incoming.type != "text/plain") return
        val raw = incoming.getStringExtra(Intent.EXTRA_TEXT).orEmpty().take(4096)
        val link = Regex("https?://[^\\s<>\\\"']+").find(raw)?.value
            ?.trimEnd('.', ',', ')', ']', '!', '?') ?: return
        if (link.length > 1200) return
        val parsed = try { Uri.parse(link) } catch (_: Exception) { return }
        if (parsed.scheme != "https") return
        val host = parsed.host?.lowercase() ?: return
        if (host !in setOf("open.spotify.com", "music.youtube.com", "www.youtube.com", "youtube.com", "youtu.be")) return
        val label = if (host.contains("spotify")) "Spotify" else "YouTube"
        // Only an explicitly shared supported music URL is accepted. No message or notification scanning.
        lastSharedMedia = JSONObject()
            .put("source", label).put("url", link)
            .put("receivedAt", System.currentTimeMillis()).toString()
        executeJs("window.DTV12&&window.DTV12.onExplicitMediaShare&&window.DTV12.onExplicitMediaShare()")
    }

    override fun onRequestPermissionsResult(requestCode:Int, permissions:Array<out String>, grantResults:IntArray) {
        super.onRequestPermissionsResult(requestCode,permissions,grantResults)
        if(requestCode==microphoneRequest){
            val request=pendingMicrophone
            pendingMicrophone=null
            if(request!=null) {
                if(grantResults.firstOrNull()==PackageManager.PERMISSION_GRANTED&&request.origin?.host=="appassets.androidplatform.net")
                    request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
                else request.deny()
            }
        }
    }
    private fun executeJs(value: String) { runOnUiThread { if (::web.isInitialized) web.evaluateJavascript(value, null) } }
    @Suppress("DEPRECATION")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if(requestCode==voiceRequest){
            if(resultCode==RESULT_OK){
                val words=data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull().orEmpty()
                if(words.isNotBlank())executeJs("window.DTV8&&window.DTV8.voiceResult(${JSONObject.quote(words.take(160))})")
            }
            return
        }
        if (requestCode != fileRequest) return
        val list = mutableListOf<Uri>()
        if (resultCode == RESULT_OK) {
            data?.data?.let { list.add(it) }
            data?.clipData?.let { clips ->
                for (i in 0 until clips.itemCount) list.add(clips.getItemAt(i).uri)
            }
        }
        if (list.isNotEmpty() && fileChooserIsAudio) {
            list.forEach { uri ->
                try { contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION) } catch (_: Exception) {}
                nativeLibrary.append(uri)
            }
            executeJs("window.DTV7&&window.DTV7.refreshLibrary()")
        }
        chooser?.onReceiveValue(list.takeIf { it.isNotEmpty() }?.toTypedArray())
        chooser = null
        fileChooserIsAudio = false
    }
    private fun getVolume(): Int {
        val max = audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC).coerceAtLeast(1)
        return (100f * audio.getStreamVolume(AudioManager.STREAM_MUSIC) / max).toInt()
    }
    private fun getBluetoothDevice(): String = try {
        // Only indicates a Bluetooth output device is exposed by Android, NOT active routing.
        audio.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
            .firstOrNull { it.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP || it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO }
            ?.productName?.toString().orEmpty()
    } catch (_: Exception) { "" }
    // Sensitive notification listener and cross-app media tracking intentionally removed.
    private fun openSource(name: String) {
        val pkg = when (name) {
            "spotify" -> "com.spotify.music"
            "ytmusic" -> "com.google.android.apps.youtube.music"
            "youtube" -> "com.google.android.youtube"
            else -> return
        }
        try {
            val intent = packageManager.getLaunchIntentForPackage(pkg)
                ?: Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=$pkg"))
            startActivity(intent)
        } catch (_: Exception) {}
    }
    /** All Media3 controller access remains on the Android main thread. */
    private fun updateQueueSnapshot() {
        val c = nativeController
        val out = org.json.JSONArray()
        if (c != null) {
            for (i in 0 until minOf(c.mediaItemCount,150)) {
                val item = c.getMediaItemAt(i)
                out.put(JSONObject()
                    .put("index", i)
                    .put("title", item.mediaMetadata.title?.toString().orEmpty())
                    .put("uri", item.localConfiguration?.uri?.toString().orEmpty())
                    .put("current", i == c.currentMediaItemIndex))
            }
        }
        nativeQueueSnapshot = out.toString()
    }
    private fun announceQueueChanged() {
        updateQueueSnapshot()
        executeJs("window.DTV11&&window.DTV11.queueChanged()")
    }
    private fun restorePlaybackOptions() {
        val ctrl = nativeController ?: return
        val prefs = getSharedPreferences("dt_v9_playback", MODE_PRIVATE)
        ctrl.shuffleModeEnabled = prefs.getBoolean("shuffle", false)
        ctrl.repeatMode = prefs.getInt("repeat", 0).coerceIn(0, 2)
        ctrl.setPlaybackSpeed(prefs.getFloat("speed", 1f).coerceIn(0.75f, 1.5f))
    }

    private fun getNativePlaybackSnapshot(): String {
            val ctrl = nativeController ?: return "{\"ready\":false}"
            return JSONObject().apply {
                put("ready", true); put("playing", ctrl.isPlaying)
                put("position", ctrl.currentPosition)
                put("duration", ctrl.duration)
                put("index", if (ctrl.currentMediaItem == null) -1 else ctrl.currentMediaItemIndex)
                put("uri", ctrl.currentMediaItem?.localConfiguration?.uri?.toString().orEmpty())
                put("shuffle", ctrl.shuffleModeEnabled)
                put("repeat", ctrl.repeatMode)
                put("speed", ctrl.playbackParameters.speed)
                put("title", ctrl.mediaMetadata.title?.toString().orEmpty())
            }.toString()
        }

    private inner class Bridge {
        @JavascriptInterface fun getExplicitMediaShare(): String = lastSharedMedia

        @JavascriptInterface fun consumeSharedMedia(): String {
            val value = lastSharedMedia
            lastSharedMedia = "{}"
            return value
        }

        @JavascriptInterface fun applyNativeEQ(raw:String, enabled:Boolean):Boolean {
            return try {
                if(raw.length>450)return false
                val data=org.json.JSONArray(raw)
                if(data.length()!=28)return false
                val values=DoubleArray(28){data.getDouble(it)}
                if(!values.all{it.isFinite()&&it in -12.0..12.0})return false
                runOnUiThread{
                    try{
                        startService(Intent(this@MainActivity,PlaybackService::class.java)
                            .setAction("com.drivetone.studio.UPDATE_EQ")
                            .putExtra("bands",values).putExtra("enabled",enabled))
                    }catch(_:Exception){}
                }
                true
            }catch(_:Exception){false}
        }
        @JavascriptInterface fun getNativeEQStatus():String {
            val p=getSharedPreferences("dt_v8_audio",MODE_PRIVATE)
            return JSONObject().put("state",p.getString("state","waiting"))
                .put("bands",p.getInt("realBands",0))
                .put("detail",p.getString("detail",""))
                .put("enabled",p.getBoolean("enabled",false)).toString()
        }
        @JavascriptInterface fun startVoiceCommand():Boolean {
            val intent=Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply{
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE,"tr-TR")
                putExtra(RecognizerIntent.EXTRA_PROMPT,"DRIVETONE: ses aç / ses kıs / durdur / sonraki")
            }
            runOnUiThread{
                try{startActivityForResult(intent,voiceRequest)}
                catch(_:Exception){executeJs("window.DTV8&&window.DTV8.voiceError()")}
            }
            return true
        }
        @JavascriptInterface fun getV8Diagnostics():String {
            val battery=getSystemService(BATTERY_SERVICE) as? android.os.BatteryManager
            return JSONObject()
                .put("android",android.os.Build.VERSION.RELEASE)
                .put("model",android.os.Build.MODEL.take(70))
                .put("battery",battery?.getIntProperty(android.os.BatteryManager.BATTERY_PROPERTY_CAPACITY)?:-1)
                .put("volume",getVolume())
                .put("notificationAccess",notificationPermissionEnabled())
                .put("nativePlayerReady",nativeController!=null).toString()
        }

        @JavascriptInterface fun saveProfileJson(content: String): String {
            if (content.length > 35000 || !content.contains("\"drivetone.eq\"")) return "ERR:invalid profile"
            return try {
                val filename = "DRIVETONE_EQ_" + System.currentTimeMillis() + ".json"
                if (android.os.Build.VERSION.SDK_INT >= 29) {
                    val values = ContentValues().apply {
                        put(MediaStore.Downloads.DISPLAY_NAME, filename)
                        put(MediaStore.Downloads.MIME_TYPE, "application/json")
                        put(MediaStore.Downloads.RELATIVE_PATH, android.os.Environment.DIRECTORY_DOWNLOADS + "/")
                    }
                    val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                        ?: return "ERR:storage unavailable"
                    contentResolver.openOutputStream(uri)?.use { it.write(content.toByteArray(Charsets.UTF_8)) }
                        ?: return "ERR:write failed"
                    "OK:Downloads/" + filename
                } else {
                    val folder = getExternalFilesDir(android.os.Environment.DIRECTORY_DOWNLOADS)
                        ?: return "ERR:storage unavailable"
                    java.io.File(folder, filename).writeText(content, Charsets.UTF_8)
                    "OK:app storage/" + filename
                }
            } catch (_: Exception) { "ERR:storage unavailable" }
        }
        @JavascriptInterface fun hapticTick() { runOnUiThread { if (::web.isInitialized) web.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK) } }
        @JavascriptInterface fun getNativeLibrary(): String = nativeLibrary.json()
        @JavascriptInterface fun getNativePlayback(): String = playbackSnapshot
        @JavascriptInterface fun nativePlay(index: Int) {
            runOnUiThread {
                val ctrl = nativeController ?: return@runOnUiThread
                val tracks = nativeLibrary.all()
                if(index !in tracks.indices) return@runOnUiThread
                if (!nativeLibrary.exists(index)) {
                    executeJs("window.DTV7&&window.DTV7.nativeError()")
                    return@runOnUiThread
                }
                val items = tracks.map { t -> MediaItem.Builder()
                    .setUri(t.uri)
                    .setMediaMetadata(NativeMetadata.Builder().setTitle(t.title).build())
                    .build() }
                ctrl.setMediaItems(items,index,0)
                ctrl.prepare();ctrl.play()
                announceQueueChanged()
            }
        }
        /**
         * V10: Play only selected, already-authorized library items.
         * Raw input is an array of library indices, never arbitrary file URLs.
         */
        @JavascriptInterface fun nativePlayCollection(rawIndices: String, shuffle: Boolean): Boolean {
            if (rawIndices.length > 550 || nativeController == null) return false
            return try {
                val array = org.json.JSONArray(rawIndices)
                if (array.length() !in 1..80) return false
                val saved = nativeLibrary.all()
                val selected = ArrayList<Int>()
                for (i in 0 until array.length()) {
                    val index = array.getInt(i)
                    if (index !in saved.indices) return false
                    if (!selected.contains(index)) selected.add(index)
                }
                if (selected.isEmpty() || !nativeLibrary.exists(selected.first())) return false
                runOnUiThread {
                    val controller = nativeController ?: return@runOnUiThread
                    try {
                        val current = nativeLibrary.all()
                        val items = selected.mapNotNull { i ->
                            current.getOrNull(i)?.let { track ->
                                MediaItem.Builder()
                                    .setUri(track.uri)
                                    .setMediaMetadata(NativeMetadata.Builder().setTitle(track.title).build())
                                    .build()
                            }
                        }
                        if (items.isEmpty()) return@runOnUiThread
                        controller.shuffleModeEnabled = shuffle
                        controller.setMediaItems(items, 0, 0L)
                        controller.prepare()
                        controller.play()
                        announceQueueChanged()
                    } catch (_: Exception) {
                        executeJs("window.DTV10&&window.DTV10.playbackError()")
                    }
                }
                true
            } catch (_: Exception) { false }
        }
        @JavascriptInterface fun configureV11(crossfade: Int, normalize: Boolean): Boolean {
            if(crossfade !in listOf(0,2,4,8))return false
            runOnUiThread {
                try {
                    startService(Intent(this@MainActivity,PlaybackService::class.java)
                        .setAction("com.drivetone.studio.UPDATE_V11")
                        .putExtra("crossfade",crossfade).putExtra("normalize",normalize))
                }catch(_:Exception){}
            }
            return true
        }
        @JavascriptInterface fun getV11Status(): String {
            val p=getSharedPreferences("dt_v11_effects",MODE_PRIVATE)
            return JSONObject().put("crossfade",p.getInt("crossfade",0))
                .put("normalize",p.getBoolean("normalize",false))
                .put("normalizeState",p.getString("normalizeState","waiting")).toString()
        }
        @JavascriptInterface fun nativeQueueMove(from:Int, to:Int): Boolean {
            if (from < 0 || to < 0 || from == to) return false
            runOnUiThread {
                val c = nativeController ?: return@runOnUiThread
                if (from !in 0 until c.mediaItemCount || to !in 0 until c.mediaItemCount) return@runOnUiThread
                try { c.moveMediaItem(from,to);announceQueueChanged() } catch (_:Exception) {}
            }
            return true
        }
        @JavascriptInterface fun nativeQueueRemove(index:Int): Boolean {
            if (index < 0) return false
            runOnUiThread {
                val c = nativeController ?: return@runOnUiThread
                if (index !in 0 until c.mediaItemCount) return@runOnUiThread
                try { c.removeMediaItem(index);announceQueueChanged() } catch (_:Exception) {}
            }
            return true
        }
        @JavascriptInterface fun nativeQueueJson():String = nativeQueueSnapshot
        @JavascriptInterface fun setV11Fullscreen(open:Boolean) {
            fullScreenPlayerV11 = open
        }
        @JavascriptInterface fun nativePlaybackOptions(shuffle: Boolean, repeat: Int, speed: Float): Boolean {
            if (repeat !in 0..2 || !speed.isFinite() || speed < .75f || speed > 1.5f) return false
            getSharedPreferences("dt_v9_playback", MODE_PRIVATE).edit()
                .putBoolean("shuffle",shuffle).putInt("repeat",repeat).putFloat("speed",speed).apply()
            runOnUiThread { restorePlaybackOptions() }
            return true
        }
        @JavascriptInterface fun nativePause() { runOnUiThread { nativeController?.pause() } }
        @JavascriptInterface fun nativeToggle() { runOnUiThread {
            nativeController?.let { if(it.isPlaying) it.pause() else it.play() }
        }}
        @JavascriptInterface fun nativeNext() { runOnUiThread { nativeController?.seekToNextMediaItem() } }
        @JavascriptInterface fun nativePrevious() { runOnUiThread { nativeController?.seekToPreviousMediaItem() } }
        @JavascriptInterface fun nativeSeek(position: Long) { runOnUiThread {
            nativeController?.seekTo(position.coerceAtLeast(0L))
        }}
        @JavascriptInterface fun nativeRemove(index: Int) {
            runOnUiThread {
                val removedUri = nativeLibrary.all().getOrNull(index)?.uri ?: return@runOnUiThread
                if (nativeLibrary.remove(index)) {
                    // The playback queue may no longer match library indices.
                    // Match by persistent URI rather than removing an arbitrary position.
                    nativeController?.let { ctrl ->
                        for (i in ctrl.mediaItemCount - 1 downTo 0) {
                            if (ctrl.getMediaItemAt(i).localConfiguration?.uri == removedUri) {
                                ctrl.removeMediaItem(i)
                            }
                        }
                    }
                    announceQueueChanged()
                    executeJs("window.DTV7&&window.DTV7.refreshLibrary()")
                }
            }
        }
        @JavascriptInterface fun nativeClear() {
            runOnUiThread {
                nativeController?.stop()
                nativeController?.clearMediaItems()
                nativeLibrary.clear()
                announceQueueChanged()
                executeJs("window.DTV7&&window.DTV7.refreshLibrary()")
            }
        }
        @JavascriptInterface fun saveBackupJson(content: String): String {
            if (content.length > 170000 || !content.contains("\"drivetone.backup\"")) return "ERR:invalid backup"
            return try {
                val filename = "DRIVETONE_BACKUP_" + System.currentTimeMillis() + ".json"
                if (android.os.Build.VERSION.SDK_INT >= 29) {
                    val values = ContentValues().apply {
                        put(MediaStore.Downloads.DISPLAY_NAME, filename)
                        put(MediaStore.Downloads.MIME_TYPE, "application/json")
                        put(MediaStore.Downloads.RELATIVE_PATH, android.os.Environment.DIRECTORY_DOWNLOADS + "/")
                    }
                    val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                        ?: return "ERR:storage unavailable"
                    val wrote = contentResolver.openOutputStream(uri)?.use {
                        it.write(content.toByteArray(Charsets.UTF_8)); true
                    } ?: false
                    if (wrote) "OK:Downloads/" + filename else "ERR:write failed"
                } else {
                    val folder = getExternalFilesDir(android.os.Environment.DIRECTORY_DOWNLOADS)
                        ?: return "ERR:storage unavailable"
                    java.io.File(folder, filename).writeText(content, Charsets.UTF_8)
                    "OK:app storage/" + filename
                }
            } catch (_: Exception) { "ERR:storage unavailable" }
        }
        @JavascriptInterface fun getRoutedOutput(): String {
            val out = JSONObject()
            if (android.os.Build.VERSION.SDK_INT < 33) {
                return out.put("supported", false).put("reason", "Android 13 ve ustunde tahmini ses yolu goruntulenebilir").toString()
            }
            return try {
                val attrs = android.media.AudioAttributes.Builder()
                    .setUsage(android.media.AudioAttributes.USAGE_MEDIA).build()
                val devices = audio.getAudioDevicesForAttributes(attrs)
                val array = org.json.JSONArray()
                devices.forEach { device ->
                    val label = when (device.type) {
                        AudioDeviceInfo.TYPE_BLUETOOTH_A2DP, AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> "Bluetooth"
                        AudioDeviceInfo.TYPE_WIRED_HEADPHONES, AudioDeviceInfo.TYPE_WIRED_HEADSET -> "Kablolu kulaklik"
                        AudioDeviceInfo.TYPE_USB_HEADSET, AudioDeviceInfo.TYPE_USB_DEVICE -> "USB ses"
                        AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> "Telefon hoparloru"
                        AudioDeviceInfo.TYPE_HDMI -> "HDMI"
                        else -> "Diger cikis"
                    }
                    array.put(JSONObject().put("category", label)
                        .put("product", device.productName?.toString().orEmpty().take(120))
                        .put("type", device.type))
                }
                out.put("supported", true).put("predicted", true).put("devices", array).toString()
            } catch (_: Exception) {
                out.put("supported", false).put("reason", "Ses cikisi okunamadi").toString()
            }
        }
        @JavascriptInterface fun getMediaVolume(): Int = getVolume()
        @JavascriptInterface fun setMediaVolume(percent: Int) {
            try {
                val mx = audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
                audio.setStreamVolume(AudioManager.STREAM_MUSIC, (mx * percent.coerceIn(0, 100) / 100f).toInt(), 0)
            } catch (_: Exception) {}
        }
        @JavascriptInterface fun getCurrentMedia(): String = ""
        @JavascriptInterface fun getBluetoothOutput(): String = getBluetoothDevice()
        @JavascriptInterface fun notificationPermissionEnabled(): Boolean = false
        @JavascriptInterface fun setActiveTab(name: String) {
            if (name in setOf("home", "eq", "cabin", "sources", "settings")) activeTab = name
        }
        @JavascriptInterface fun toggleMedia() {
            runOnUiThread { nativeController?.let { if (it.isPlaying) it.pause() else it.play() } }
        }
        @JavascriptInterface fun nextMedia() { runOnUiThread { nativeController?.seekToNextMediaItem() } }
        @JavascriptInterface fun previousMedia() { runOnUiThread { nativeController?.seekToPreviousMediaItem() } }
        @JavascriptInterface fun openMusicApp(name: String): Boolean {
            if (name !in setOf("spotify", "ytmusic", "youtube")) return false
            runOnUiThread { openSource(name) }
            return true
        }
        @JavascriptInterface fun openBluetoothSettings() = runOnUiThread {
            startActivity(Intent(Settings.ACTION_BLUETOOTH_SETTINGS))
        }
    }
    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        if (fullScreenPlayerV11) {
            fullScreenPlayerV11 = false
            executeJs("window.DTV11&&window.DTV11.closePlayer()")
            return
        }
        if (activeTab != "home") {
            activeTab = "home"
            executeJs("window.DRIVETONE&&window.DRIVETONE.goTo('home')")
        } else super.onBackPressed()
    }
    override fun onResume() {
        super.onResume()
        handler.removeCallbacks(monitor)
        handler.postDelayed(monitor, 1000)
    }
    override fun onPause() { handler.removeCallbacks(monitor); super.onPause() }
    override fun onDestroy() {
        handler.removeCallbacks(monitor)
        nativeFuture?.let { NativeController.releaseFuture(it) }
        if (::web.isInitialized) {
            web.removeJavascriptInterface("AndroidBridge")
            web.destroy()
        }
        super.onDestroy()
    }
}
