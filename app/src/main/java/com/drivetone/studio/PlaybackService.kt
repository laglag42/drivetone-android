package com.drivetone.studio
import android.content.Intent
import android.media.audiofx.Equalizer
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import org.json.JSONArray
import kotlin.math.abs
import kotlin.math.ln
import kotlin.math.max

/** Device-supported audio-session EQ (up to device's actual band count). */
class PlaybackService : MediaSessionService() {
    private var session: MediaSession? = null
    private var player: ExoPlayer? = null
    private var eq: Equalizer? = null
    private var audioSession = 0
    private val prefs by lazy { getSharedPreferences("dt_v8_audio", MODE_PRIVATE) }
    private val centers = intArrayOf(25,31,40,50,63,80,100,125,160,200,250,315,400,500,630,800,1000,1250,1600,2000,2500,3150,4000,5000,6300,8000,10000,16000)
    private var target = DoubleArray(28)
    private var active = false
    private fun report(state:String, count:Int=0, detail:String="") {
        prefs.edit().putString("state",state).putInt("realBands",count).putString("detail",detail.take(180)).apply()
    }
    override fun onCreate() {
        super.onCreate()
        active = prefs.getBoolean("enabled",false)
        try {
            val a = JSONArray(prefs.getString("bands","[]"))
            if(a.length()==28) target=DoubleArray(28){a.getDouble(it).coerceIn(-12.0,12.0)}
        } catch(_:Exception) { active=false }
        val exo=ExoPlayer.Builder(this).build()
        exo.setAudioAttributes(AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).build(),true)
        exo.addListener(object:Player.Listener {
            override fun onAudioSessionIdChanged(audioSessionId:Int) { attach(audioSessionId) }
        })
        player=exo
        session=MediaSession.Builder(this,exo).build()
    }
    private fun attach(id:Int) {
        if(audioSession==id&&eq!=null)return
        eq?.release();eq=null;audioSession=id
        if(id<=0){report("waiting",0,"Ses oturumu bekleniyor");return}
        try {eq=Equalizer(0,id); applyBands()}
        catch(e:Exception){report("unsupported",0,"Cihaz EQ desteklemiyor: "+e.javaClass.simpleName)}
    }
    private fun applyBands() {
        val fx=eq?:run {report("waiting",0,"Yerel müzik başlayınca EQ etkinleşir");return}
        try {
            val count=fx.numberOfBands.toInt()
            val range=fx.bandLevelRange
            require(count>0&&range.size>=2)
            for(i in 0 until count) {
                val hz=max(1.0,fx.getCenterFreq(i.toShort()).toDouble()/1000.0)
                val nearest=centers.indices.minByOrNull {abs(ln(centers[it].toDouble()/hz))}?:0
                val db=if(active)(target[nearest]*100).toInt()else 0
                fx.setBandLevel(i.toShort(),db.coerceIn(range[0].toInt(),range[1].toInt()).toShort())
            }
            fx.enabled=active
            report(if(active)"active" else "off",count,"28 kontrol, Android tarafinda "+count+" fiziksel bant")
        }catch(e:Exception){try{fx.enabled=false}catch(_:Exception){};report("unsupported",0,e.javaClass.simpleName)}
    }
    override fun onStartCommand(intent:Intent?,flags:Int,startId:Int):Int {
        if(intent?.action=="com.drivetone.studio.UPDATE_EQ"){
            val values=intent.getDoubleArrayExtra("bands")
            if(values!=null&&values.size==28&&values.all{it.isFinite()&&it in -12.0..12.0}){
                target=values.copyOf(); active=intent.getBooleanExtra("enabled",true)
                val a=JSONArray();values.forEach{a.put(it)}
                prefs.edit().putString("bands",a.toString()).putBoolean("enabled",active).apply()
                applyBands()
            }else report("error",0,"Gecersiz EQ verisi")
            return START_NOT_STICKY
        }
        return super.onStartCommand(intent,flags,startId)
    }
    override fun onGetSession(controllerInfo:MediaSession.ControllerInfo):MediaSession?=session
    override fun onDestroy(){eq?.release();eq=null;session?.release();session=null;player?.release();player=null;super.onDestroy()}
}
