package com.drivetone.studio

import android.content.Intent
import android.media.audiofx.Equalizer
import android.media.audiofx.DynamicsProcessing
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import org.json.JSONArray
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min

/** V11: Media3 native audio, two-decoder crossfade, device EQ, optional dynamics control.
 *  Does NOT affect Spotify/YouTube or issue FOR-X proprietary commands.
 */
class PlaybackService : MediaSessionService() {
    private var session: MediaSession? = null
    private var player: ExoPlayer? = null
    private var eq: Equalizer? = null
    private var dynamics: DynamicsProcessing? = null
    private var audioSession = 0
    private val handler = Handler(Looper.getMainLooper())
    private val prefs by lazy { getSharedPreferences("dt_v8_audio", MODE_PRIVATE) }
    private val v11 by lazy { getSharedPreferences("dt_v11_effects", MODE_PRIVATE) }
    private val centers = intArrayOf(25,31,40,50,63,80,100,125,160,200,250,315,400,500,630,800,1000,1250,1600,2000,2500,3150,4000,5000,6300,8000,10000,16000)
    private var target = DoubleArray(28)
    private var active = false
    private var fadeSeconds = 0
    private var normalize = false
    private var incoming: ExoPlayer? = null
    private var outgoing: ExoPlayer? = null
    private var fadeStart = 0L
    private var fadeDuration = 0L
    private var fadeIndex = -1

    private val attributes = AudioAttributes.Builder()
        .setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).build()

    private fun makePlayer(handlesFocus: Boolean): ExoPlayer {
        val exo = ExoPlayer.Builder(this).build()
        exo.setAudioAttributes(attributes, handlesFocus)
        exo.addListener(object : Player.Listener {
            override fun onAudioSessionIdChanged(audioSessionId: Int) {
                if (exo === player) attachEffects(audioSessionId)
            }
            override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                if (exo === incoming) cancelFade()
            }
            override fun onMediaItemTransition(mediaItem: androidx.media3.common.MediaItem?, reason: Int) {
                if (exo === player && incoming != null && exo.currentMediaItemIndex != fadeIndex) {
                    finishFade()
                }
            }
        })
        return exo
    }
    private fun report(state: String, count: Int = 0, detail: String = "") {
        prefs.edit().putString("state",state).putInt("realBands",count).putString("detail",detail.take(180)).apply()
    }
    override fun onCreate() {
        super.onCreate()
        active=prefs.getBoolean("enabled",false)
        try {
            val a=JSONArray(prefs.getString("bands","[]"))
            if(a.length()==28)target=DoubleArray(28){a.getDouble(it).coerceIn(-12.0,12.0)}
        }catch(_:Exception){active=false}
        fadeSeconds=v11.getInt("crossfade",0).coerceIn(0,8)
        normalize=v11.getBoolean("normalize",false)
        val exo=makePlayer(true)
        player=exo
        session=MediaSession.Builder(this,exo).build()
        handler.postDelayed(fadeTick,250)
    }
    private val fadeTick: Runnable = object:Runnable {
        override fun run() {
            try { tickFade() } catch (_:Exception){cancelFade()}
            handler.postDelayed(this,100)
        }
    }
    private fun tickFade(){
        val current=player?:return
        val secondary=incoming
        if(secondary!=null){
            if(outgoing!==current || !current.isPlaying && current.playbackState!=Player.STATE_ENDED){
                cancelFade();return
            }
            val progress=((android.os.SystemClock.elapsedRealtime()-fadeStart).toFloat()/fadeDuration.coerceAtLeast(1L)).coerceIn(0f,1f)
            // Equal-power crossfade for two simultaneous decoders.
            current.volume=kotlin.math.cos(progress*Math.PI.toFloat()/2f).coerceIn(0f,1f)
            secondary.volume=kotlin.math.sin(progress*Math.PI.toFloat()/2f).coerceIn(0f,1f)
            if(progress>=1f||current.currentMediaItemIndex!=fadeIndex)finishFade()
            return
        }
        if(fadeSeconds<=0||!current.isPlaying||current.playbackState!=Player.STATE_READY)return
        if(current.shuffleModeEnabled)return // avoid prefetching the wrong shuffle target
        if(current.playbackParameters.speed!=1f)return // avoid accelerated timing mismatch
        val duration=current.duration
        if(duration<=0||duration==C.TIME_UNSET)return
        val next=current.nextMediaItemIndex
        if(next<0||next>=current.mediaItemCount)return
        val remaining=duration-current.currentPosition
        val ms=fadeSeconds.toLong()*1000L
        if(remaining<=0||remaining>ms||remaining < 350L)return
        try{
            val upcoming=makePlayer(false)
            val list=(0 until current.mediaItemCount).map{current.getMediaItemAt(it)}
            upcoming.setMediaItems(list,next,0L)
            upcoming.repeatMode=current.repeatMode
            upcoming.shuffleModeEnabled=current.shuffleModeEnabled
            upcoming.setPlaybackSpeed(current.playbackParameters.speed)
            upcoming.volume=0f
            outgoing=current
            incoming=upcoming
            fadeIndex=current.currentMediaItemIndex
            fadeDuration=remaining.coerceAtMost(ms).coerceAtLeast(500)
            fadeStart=android.os.SystemClock.elapsedRealtime()
            upcoming.prepare()
            upcoming.play()
        }catch(_:Exception){cancelFade()}
    }
    private fun finishFade(){
        val newPlayer=incoming?:return
        val old=outgoing?:return
        incoming=null;outgoing=null;fadeIndex=-1
        try {
            newPlayer.volume=1f
            session?.setPlayer(newPlayer)
            player=newPlayer
            attachEffects(newPlayer.audioSessionId)
            // Allow the new player to manage audio focus after the handoff.
            newPlayer.setAudioAttributes(attributes,true)
            old.stop();old.release()
        } catch (_:Exception){
            try {newPlayer.stop();newPlayer.release()}catch(_:Exception){}
            old.volume=1f
        }
    }
    private fun cancelFade(){
        val second=incoming
        incoming=null;outgoing=null;fadeIndex=-1
        try{second?.stop();second?.release()}catch(_:Exception){}
        player?.volume=1f
    }
    private fun attachEffects(id:Int){
        if(id==audioSession&&eq!=null)return
        eq?.release();eq=null
        dynamics?.release();dynamics=null
        audioSession=id
        if(id<=0){report("waiting",0,"Ses oturumu bekleniyor");return}
        try {eq=Equalizer(0,id);applyBands()}
        catch(e:Exception){report("unsupported",0,e.javaClass.simpleName)}
        applyDynamics()
    }
    private fun interpolatedDb(hz:Double):Double{
        if(hz<=centers.first())return target.first()
        if(hz>=centers.last())return target.last()
        val upper=centers.indexOfFirst{it>=hz}.coerceIn(1,centers.lastIndex)
        val a=centers[upper-1].toDouble();val b=centers[upper].toDouble()
        val fraction=(ln(hz)-ln(a))/(ln(b)-ln(a))
        return (target[upper-1]*(1-fraction)+target[upper]*fraction).coerceIn(-12.0,12.0)
    }
    private fun applyBands(){
        val fx=eq?:run{report("waiting",0,"Muzik baslatilinca EQ uygulanir");return}
        try{
            val count=fx.numberOfBands.toInt();val range=fx.bandLevelRange
            require(count>0&&range.size>=2)
            for(i in 0 until count){
                val hz=max(1.0,fx.getCenterFreq(i.toShort())/1000.0)
                val mb=if(active)(interpolatedDb(hz)*100.0).toInt()else 0
                fx.setBandLevel(i.toShort(),mb.coerceIn(range[0].toInt(),range[1].toInt()).toShort())
            }
            fx.enabled=active
            report(if(active)"active" else "off",count,"28 kontrol / $count Android EQ bandi")
        }catch(e:Exception){try{fx.enabled=false}catch(_:Exception){};report("unsupported",0,e.javaClass.simpleName)}
    }
    private fun applyDynamics(){
        dynamics?.release();dynamics=null
        v11.edit().putString("normalizeState", if(normalize)"waiting" else "off").apply()
        if(!normalize||audioSession<=0||Build.VERSION.SDK_INT<28)return
        try{
            val cfg=DynamicsProcessing.Config.Builder(
                DynamicsProcessing.VARIANT_FAVOR_TIME_RESOLUTION,2,false,0,true,1,false,0,true
            ).build()
            val fx=DynamicsProcessing(0,audioSession,cfg)
            val band=DynamicsProcessing.MbcBand(
                true,20000f,15f,240f,2.0f,-18f,6f,-80f,1f,0f,0f
            )
            fx.setMbcBandAllChannelsTo(0,band)
            fx.enabled=true
            dynamics=fx
            v11.edit().putString("normalizeState","active").apply()
        }catch(_:Exception){
            v11.edit().putString("normalizeState","unsupported").apply()
        }
    }
    override fun onStartCommand(intent:Intent?,flags:Int,startId:Int):Int{
        if(intent?.action=="com.drivetone.studio.UPDATE_EQ"){
            val values=intent.getDoubleArrayExtra("bands")
            if(values!=null&&values.size==28&&values.all{it.isFinite()&&it in -12.0..12.0}){
                target=values.copyOf();active=intent.getBooleanExtra("enabled",true)
                val a=JSONArray();values.forEach{a.put(it)}
                prefs.edit().putString("bands",a.toString()).putBoolean("enabled",active).apply()
                applyBands()
            }else report("error",0,"Gecersiz EQ verisi")
            return START_NOT_STICKY
        }
        if(intent?.action=="com.drivetone.studio.UPDATE_V11"){
            fadeSeconds=intent.getIntExtra("crossfade",0).coerceIn(0,8)
            normalize=intent.getBooleanExtra("normalize",false)
            v11.edit().putInt("crossfade",fadeSeconds).putBoolean("normalize",normalize).apply()
            if(fadeSeconds==0)cancelFade()
            applyDynamics()
            return START_NOT_STICKY
        }
        return super.onStartCommand(intent,flags,startId)
    }
    override fun onGetSession(controllerInfo:MediaSession.ControllerInfo):MediaSession?=session
    override fun onDestroy(){
        handler.removeCallbacks(fadeTick)
        cancelFade()
        eq?.release();eq=null;dynamics?.release();dynamics=null
        session?.release();session=null;player?.release();player=null
        super.onDestroy()
    }
}
