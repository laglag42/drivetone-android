package com.drivetone.studio

import android.app.Activity
import android.content.ComponentName
import android.content.ContentValues
import android.content.Intent
import android.graphics.Color
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.net.Uri
import android.os.Bundle
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
    private lateinit var audio: AudioManager
    private lateinit var loader: WebViewAssetLoader
    private var chooser: ValueCallback<Array<Uri>>? = null
    private val fileRequest = 5274
    private val handler = Handler(Looper.getMainLooper())
    private var previousVolume = -1
    private var previousMedia = ""
    private var previousDevice = ""
    @Volatile private var activeTab = "home"
    private val monitor = object : Runnable {
        override fun run() {
            if (!isFinishing && ::web.isInitialized) {
                val v = getVolume()
                if (v != previousVolume) {
                    previousVolume = v
                    executeJs("window.DRIVETONE&&window.DRIVETONE.onVolumeChanged($v)")
                }
                val m = readMedia()
                if (m != previousMedia) {
                    previousMedia = m
                    executeJs("window.DRIVETONE&&window.DRIVETONE.onMediaUpdate(${if (m.isEmpty()) "{}" else m})")
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
        window.statusBarColor = Color.rgb(247,247,245)
        window.navigationBarColor = Color.rgb(250,250,249)
        window.decorView.systemUiVisibility = android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR or android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
        audio = getSystemService(AUDIO_SERVICE) as AudioManager
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
            override fun onShowFileChooser(view: WebView?, callback: ValueCallback<Array<Uri>>?, params: FileChooserParams?): Boolean {
                chooser?.onReceiveValue(null)
                chooser = callback
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
    }
    private fun executeJs(value: String) { runOnUiThread { if (::web.isInitialized) web.evaluateJavascript(value, null) } }
    @Suppress("DEPRECATION")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != fileRequest) return
        val list = mutableListOf<Uri>()
        if (resultCode == RESULT_OK) {
            data?.data?.let { list.add(it) }
            data?.clipData?.let { clips ->
                for (i in 0 until clips.itemCount) list.add(clips.getItemAt(i).uri)
            }
        }
        chooser?.onReceiveValue(list.takeIf { it.isNotEmpty() }?.toTypedArray())
        chooser = null
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
    private fun mediaControllers(): List<MediaController> = try {
        val mgr = getSystemService(MEDIA_SESSION_SERVICE) as MediaSessionManager
        mgr.getActiveSessions(ComponentName(this, MediaAccessListener::class.java))
    } catch (_: Exception) { emptyList() }
    private fun mediaController(): MediaController? {
        val list = mediaControllers()
        return list.firstOrNull { it.playbackState?.state == PlaybackState.STATE_PLAYING } ?: list.firstOrNull()
    }
    private fun readMedia(): String {
        val ctrl = mediaController() ?: return ""
        val md = ctrl.metadata ?: return ""
        val title = md.getString(MediaMetadata.METADATA_KEY_TITLE)?.takeIf { it.isNotBlank() } ?: return ""
        return JSONObject().apply {
            put("title", title)
            put("artist", md.getString(MediaMetadata.METADATA_KEY_ARTIST).orEmpty())
            put("packageName", ctrl.packageName)
            put("playing", ctrl.playbackState?.state == PlaybackState.STATE_PLAYING)
        }.toString()
    }
    private fun control(action: String) {
        val ctrl = mediaController() ?: return
        when (action) {
            "toggle" -> if (ctrl.playbackState?.state == PlaybackState.STATE_PLAYING) ctrl.transportControls.pause() else ctrl.transportControls.play()
            "next" -> ctrl.transportControls.skipToNext()
            "previous" -> ctrl.transportControls.skipToPrevious()
        }
    }
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
    private inner class Bridge {
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
        @JavascriptInterface fun getMediaVolume(): Int = getVolume()
        @JavascriptInterface fun setMediaVolume(percent: Int) {
            try {
                val mx = audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
                audio.setStreamVolume(AudioManager.STREAM_MUSIC, (mx * percent.coerceIn(0, 100) / 100f).toInt(), 0)
            } catch (_: Exception) {}
        }
        @JavascriptInterface fun getCurrentMedia(): String = readMedia()
        @JavascriptInterface fun getBluetoothOutput(): String = getBluetoothDevice()
        @JavascriptInterface fun notificationPermissionEnabled(): Boolean = try {
            Settings.Secure.getString(contentResolver, "enabled_notification_listeners").orEmpty().contains(packageName)
        } catch (_: Exception) { false }
        @JavascriptInterface fun setActiveTab(name: String) {
            if (name in setOf("home", "eq", "cabin", "sources", "settings")) activeTab = name
        }
        @JavascriptInterface fun toggleMedia() = control("toggle")
        @JavascriptInterface fun nextMedia() = control("next")
        @JavascriptInterface fun previousMedia() = control("previous")
        @JavascriptInterface fun openMusicApp(name: String): Boolean {
            if (name !in setOf("spotify", "ytmusic", "youtube")) return false
            runOnUiThread { openSource(name) }
            return true
        }
        @JavascriptInterface fun openNotificationAccess() = runOnUiThread {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        }
        @JavascriptInterface fun openBluetoothSettings() = runOnUiThread {
            startActivity(Intent(Settings.ACTION_BLUETOOTH_SETTINGS))
        }
    }
    @Suppress("DEPRECATION")
    override fun onBackPressed() {
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
        if (::web.isInitialized) {
            web.removeJavascriptInterface("AndroidBridge")
            web.destroy()
        }
        super.onDestroy()
    }
}
