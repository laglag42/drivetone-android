package com.drivetone.studio

import android.content.Intent
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService

/**
 * V7: Android-native playback independent from the WebView.
 * ExoPlayer handles audio focus; MediaSession provides lock-screen and Bluetooth controls.
 */
class PlaybackService : MediaSessionService() {
    private var playbackSession: MediaSession? = null
    private var player: ExoPlayer? = null

    override fun onCreate() {
        super.onCreate()
        val exo = ExoPlayer.Builder(this).build()
        exo.setAudioAttributes(
            AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .build(),
            true
        )
        player = exo
        playbackSession = MediaSession.Builder(this, exo).build()
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        // Only our app's UI can bind to the custom controller here; the platform
        // media controls are managed by Android through the media session.
        return playbackSession
    }

    override fun onDestroy() {
        playbackSession?.release()
        playbackSession = null
        player?.release()
        player = null
        super.onDestroy()
    }
}
