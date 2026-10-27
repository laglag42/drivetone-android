(()=>{'use strict';
const I=window.DTInternal;if(!I)return;
const q=s=>document.querySelector(s), S=I.state, native=()=>!!window.AndroidBridge, call=(k,...v)=>I.callNative(k,...v);
const get=(key,def)=>{try{const x=JSON.parse(localStorage.getItem(key));return x??def}catch{return def}};
const cfg=Object.assign({eq:false,smart:false,smartProfile:"auto",autoprofile:false,driveVoice:false,ui:"auto",carBalance:true},get("dt:v8",{}));
const safe=()=>{try{localStorage.setItem("dt:v8",JSON.stringify(cfg))}catch{}};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const btn=(id,text)=>'<button id="'+id+'" class="v8-btn">'+text+'</button>';
const heading=(title,desc)=>'<div class="v8-title">'+title+'</div><p class="v8-desc">'+desc+'</p>';
const section=(title,desc,content)=>'<section class="v8-panel">'+heading(title,desc)+content+'</section>';
const row=(id,label,desc,checked=false)=>'<label class="v8-row"><span><b>'+label+'</b><small>'+desc+'</small></span><input type="checkbox" id="'+id+'" '+(checked?'checked':'')+'></label>';
const select=(id,options)=>'<select id="'+id+'">'+options.map(([v,t])=>'<option value="'+v+'">'+t+'</option>').join('')+'</select>';
const h=q("#home"), eq=q("#eq"), cabin=q("#cabin"), settings=q("#settings"), sources=q("#sources");
eq?.insertAdjacentHTML("beforeend",section("NATIVE AUDIO EQ · V8","Android'in gerçek EQ efektini arka plan oynatıcısına uygular. Cihazın desteklediği bant sayısı değişebilir; 28 kontrol noktası donanım bantlarına eşlenir. Spotify ve YouTube sesini işlemez.",
  row("v8-native-enable","Yerel Android EQ","Arka plandaki Media3 müziklerine uygulanır",cfg.eq)+
  '<div id="v8-native-status" class="v8-info">Ses motoru bekleniyor</div>'+btn("v8-eq-send","28 bant ayarlarını Android'e uygula")));
h?.insertAdjacentHTML("beforeend",section("SMART EQ 2.0","Yerel müziğin analiz sonucuna veya türüne göre EQ önerisi verir; harici uygulamaların sesini analiz etmez.",
 row("v8-smart","Akıllı EQ önerisi","Seçtiğin müzik tipine uygun ses profili seç",cfg.smart)+
 '<label class="v8-field">Müzik tipi '+select("v8-smart-type",[["auto","Otomatik (hafif)"],["bass","Bass / Hip-Hop"],["pop","Pop"],["rock","Rock"],["vocal","Vokal"],["night","Gece"]])+'</label>'+
 btn("v8-smart-apply","Önerilen profili uygula")));
cabin?.insertAdjacentHTML("beforeend",section("CAR STUDIO 2.0","Parmağınla alan üzerinde hareket ettirerek sağ/sol ve ön/arka odağı ayarlayabilirsin. Ön/arka gerçek FOR-X teybe uygulanmaz.",
 '<div id="v8-pad" class="v8-pad" role="img" aria-label="Araç içi ses odağı: sanal ön arka, yerel sağ sol"><span>ÖN</span><span>ARKA</span><div id="v8-dot" class="v8-dot"></div></div>'+
 '<div id="v8-pos" class="v8-info">Sanal sahne</div>'+
 btn("v8-pad-center","Ses odağını merkezle")));
settings?.insertAdjacentHTML("beforeend",section("FOR-X CONNECTION LAB","Teybin Bluetooth durumunu gösterir. Gerçek bass/fader komutları için teybin kontrol protokolü doğrulanmalı.",
 '<div id="v8-headunit" class="v8-info">Bağlantı okunuyor…</div>'+
 btn("v8-connection","Bluetooth ayarlarını aç")+
 btn("v8-headunit-refresh","Ses yolunu tekrar kontrol et")));
settings?.insertAdjacentHTML("beforeend",section("ACOUSTIC MEASUREMENT · BETA","Telefon mikrofonu ile frekans dağılımının yaklaşık gösterimi. Profesyonel mikrofon kalibrasyonu değildir; müzik çalarken cihazın işleyişi etkileyebilir.",
 btn("v8-mic-start","Mikrofonu başlat")+btn("v8-mic-stop","Mikrofonu kapat")+
 '<div id="v8-mic-reading" class="v8-info">Mikrofon kapalı</div>'));
settings?.insertAdjacentHTML("beforeend",section("AUDIO DIAGNOSTICS","Android cihazı, tahmini ses yolu, EQ motoru ve hata kayıtları.",
 btn("v8-diagnostics","Tanılamayı yenile")+btn("v8-diag-copy","Raporu kopyala")+
 '<pre id="v8-diagnostics-report" class="v8-report">Tanılama bekleniyor…</pre>'));
settings?.insertAdjacentHTML("beforeend",section("V8 DISPLAY & EFFICIENCY","Tema, titreşim ve hafif görsel animasyon tercihleri.",
 '<label class="v8-field">Tema '+select("v8-ui",[["auto","Sistem / otomatik"],["light","Açık"],["dark","Koyu"]])+'</label>'+
 row("v8-reduce","Animasyonları azalt","Düşük işlem yükü ve daha sade geçişler",false)));
sources?.insertAdjacentHTML("beforeend",section("SMART LIBRARY","Kalıcı kütüphanenin yanında anlık kuyruk ve akıllı öneriler. Seçilen müziklerin dosyaları cihazda kalır.",
 btn("v8-library-open","Müzik kütüphanesine git")+btn("v8-library-refresh","Şarkı listesini güncelle")));
h?.insertAdjacentHTML("beforeend",section("ULTRA DRIVE & VOICE","Büyük düğmeler ve Türkçe sesli komutlar. Yalnızca Android'in ses tanıma uygulaması varsa çalışır; sürüş sırasında ekrana bakma.",
 btn("v8-driving","Büyük sürüş modunu aç")+btn("v8-voice","Sesli komut başlat")+
 '<p id="v8-voice-status" class="v8-desc">Örnek: ses aç, ses kıs, sonraki, durdur, bass.</p>'));
document.head.insertAdjacentHTML("beforeend",'<style>'+
'.v8-panel{padding:18px;margin:16px 0;border-radius:22px;border:1px solid var(--line);background:var(--card);min-width:0;overflow:hidden}.v8-title{font-size:12px;font-weight:850;letter-spacing:1.1px}.v8-desc{font-size:11px;line-height:1.6;color:var(--muted);margin:10px 0 16px}.v8-row{display:flex;justify-content:space-between;gap:12px;align-items:center;font-size:12px;padding:12px 0}.v8-row small{display:block;font-size:10px;color:var(--muted);margin-top:5px}.v8-row input{width:23px;height:23px;flex:none;accent-color:var(--accent)}.v8-btn{font-size:11px;min-height:45px;padding:12px;border:1px solid var(--line);background:var(--paper);border-radius:12px;max-width:100%;margin:5px 5px 5px 0;color:var(--ink);font-weight:750}.v8-btn:active{transform:scale(.98)}.v8-field{display:block;font-size:12px;margin:12px 0}.v8-field select{width:100%;padding:13px;margin-top:8px;background:var(--paper);color:var(--ink);border-radius:12px;border:1px solid var(--line)}.v8-info{font-size:11px;line-height:1.6;background:var(--soft);padding:13px;border-radius:12px;margin:12px 0;overflow-wrap:anywhere}.v8-report{font-family:ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere;font-size:10px;max-height:290px;overflow:auto;background:var(--soft);padding:11px;border-radius:13px}.v8-pad{height:230px;position:relative;touch-action:none;border-radius:18px;background:linear-gradient(155deg,#181e28,#313c49);border:1px solid #64717f;overflow:hidden}.v8-pad:before{content:"";position:absolute;inset:15%;border:2px dashed #fff3;border-radius:50%}.v8-pad span{position:absolute;left:8px;top:8px;color:#fff;font-size:10px}.v8-pad span:nth-child(2){top:auto;bottom:8px}.v8-dot{position:absolute;left:50%;top:50%;width:24px;height:24px;border-radius:50%;transform:translate(-50%,-50%);background:#f4a2b6;box-shadow:0 0 0 12px #f4a2b63d}.v8-reduce-motion *, .v8-reduce-motion *:before,.v8-reduce-motion *:after{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important}@media(max-width:325px){.v8-panel{padding:12px}.v8-btn{width:100%;margin-left:0}}'+
'</style>');
function applyTheme(){
 document.documentElement.classList.toggle("v8-reduce-motion",q("#v8-reduce")?.checked===true);
 document.documentElement.style.colorScheme=cfg.ui==="dark"?"dark":"light";
 const dark=q("#darkToggle");if(dark){const should=cfg.ui==="dark";if(dark.checked!==should){dark.checked=should;dark.dispatchEvent(new Event("change"))}}
}
q("#v8-ui").value=cfg.ui;q("#v8-smart-type").value=cfg.smartProfile;
q("#v8-reduce").checked=!!cfg.reduce;
q("#v8-native-enable").onchange=e=>{cfg.eq=e.target.checked;safe();sendEQ()};
q("#v8-eq-send").onclick=sendEQ;
let syncTimer=0, lastEQ="";
function syncIfChanged(){
 if(!cfg.eq||!native())return;
 const signature=JSON.stringify(S.eq);
 if(signature===lastEQ)return;
 lastEQ=signature;
 clearTimeout(syncTimer);
 syncTimer=setTimeout(sendEQ,450);
}
const eqRoot=q("#eqBands");
if(eqRoot)eqRoot.addEventListener("pointerup",syncIfChanged,{passive:true});
if(eqRoot)eqRoot.addEventListener("keyup",syncIfChanged);
q("#eq")?.addEventListener("click",()=>setTimeout(syncIfChanged,160));

q("#v8-smart").onchange=e=>{cfg.smart=e.target.checked;safe()};
q("#v8-smart-type").onchange=e=>{cfg.smartProfile=e.target.value;safe()};
q("#v8-smart-apply").onclick=()=>{
 const map={auto:"Natural",bass:"Bass Plus",pop:"Pop",rock:"Rock",vocal:"Vokal",night:"Gece"};
 const n=map[cfg.smartProfile]||"Natural";
 const b=[...document.querySelectorAll("[data-preset]")].find(el=>el.dataset.preset===n);
 if(b){b.click();I.toast("Smart EQ: "+n+" profili uygulandı");sendEQ()}else I.toast("EQ profili yüklenemedi");
};
function sendEQ(){
 const out=q("#v8-native-status");
 if(!native()){out.textContent="Bu özellik Android APK içinde çalışır.";return}
 const response=call("applyNativeEQ",JSON.stringify(S.eq),cfg.eq);
 out.textContent=response?"EQ ayarları Android ses motoruna gönderildi; oynatıcı etkinleştiğinde cihaz bantları uygulanacak.":"EQ ayarları kabul edilmedi.";
}
function pollEQ(){
 if(!native())return;
 try{
 const d=JSON.parse(call("getNativeEQStatus")||"{}");
 q("#v8-native-status").textContent=({active:"AKTİF",off:"KAPALI",unsupported:"CİHAZ DESTEKLEMİYOR",waiting:"BEKLİYOR",error:"HATA"}[d.state]||d.state||"Bekleniyor")+" · "+(d.bands||0)+" cihaz bandı · "+(d.detail||"");
 }catch{}
}
let drag=false;
function point(e){
 const r=q("#v8-pad").getBoundingClientRect();if(!r.width||!r.height)return;
 const x=Math.max(-100,Math.min(100,(e.clientX-r.left)/r.width*200-100));
 const y=Math.max(-100,Math.min(100,(e.clientY-r.top)/r.height*200-100));
 S.balance=Math.round(x);S.fader=Math.round(y);
 const bb=q("#balance"),ff=q("#fader");if(bb){bb.value=S.balance;bb.dispatchEvent(new Event("input"))}if(ff){ff.value=S.fader;ff.dispatchEvent(new Event("input"))}
 q("#v8-dot").style.left=((x+100)/2)+"%";q("#v8-dot").style.top=((y+100)/2)+"%";
 q("#v8-pos").textContent="Sağ/sol: "+S.balance+"% · Ön/arka sanal: "+S.fader+"%";
}
const pad=q("#v8-pad");pad.addEventListener("pointerdown",e=>{drag=true;pad.setPointerCapture(e.pointerId);point(e)});pad.addEventListener("pointermove",e=>{if(drag)point(e)});pad.addEventListener("pointerup",()=>drag=false);pad.addEventListener("pointercancel",()=>drag=false);
q("#v8-pad-center").onclick=()=>{const rect=pad.getBoundingClientRect();point({clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2})};
function route(){q("#v8-headunit").textContent=native()?"Bluetooth: "+(call("getBluetoothOutput")||"cihaz bulunamadı")+". FOR-X DSP komutları desteklenmiyor.":"Bağlı cihazı görmek için Android APK'da aç."}
q("#v8-headunit-refresh").onclick=route;q("#v8-connection").onclick=()=>call("openBluetoothSettings");
let stream=null,ac=null,an=null,micTimer=null;
const stopMic=()=>{if(micTimer)clearInterval(micTimer);micTimer=null;stream?.getTracks().forEach(t=>t.stop());stream=null;if(ac){ac.close().catch(()=>{});ac=null}an=null;q("#v8-mic-reading").textContent="Mikrofon kapalı"};
q("#v8-mic-stop").onclick=stopMic;
q("#v8-mic-start").onclick=async()=>{
 if(!navigator.mediaDevices?.getUserMedia){I.toast("Mikrofon erişimi cihazda desteklenmiyor");return}
 stopMic();
 try{
  stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
  ac=new (window.AudioContext||window.webkitAudioContext)();
  const m=ac.createMediaStreamSource(stream);an=ac.createAnalyser();an.fftSize=2048;m.connect(an);
  const raw=new Uint8Array(an.frequencyBinCount);
  micTimer=setInterval(()=>{
   an.getByteFrequencyData(raw);
   const hz=i=>i*ac.sampleRate/an.fftSize;
   const rms=(lo,hi)=>{let t=0,n=0;for(let i=1;i<raw.length;i++){const f=hz(i);if(f>=lo&&f<hi){t+=raw[i];n++}}return n?Math.round(t/n/255*100):0};
   q("#v8-mic-reading").textContent="Yaklaşık: bass "+rms(40,200)+"% · mid "+rms(200,2000)+"% · tiz "+rms(2000,9000)+"%. Bu bir SPL / dB kalibrasyonu değildir.";
  },300);
 }catch(e){stopMic();I.toast("Mikrofon izni reddedildi veya başka uygulamada")}
};
document.addEventListener("visibilitychange",()=>{if(document.hidden)stopMic()});
let report="";
function diagnostics(){
 const dt=new Date().toISOString();let d={};
 try{d=JSON.parse(call("getV8Diagnostics")||"{}")}catch{}
 let eq={};try{eq=JSON.parse(call("getNativeEQStatus")||"{}")}catch{}
 report=JSON.stringify({timestamp:dt,version:8,android:native(),device:d,eq,ui:{theme:cfg.ui,reduceMotion:cfg.reduce},local:{tracks:S.files?.length||0},notes:"Gerçek FOR-X teybe DSP komutu gönderilmez."},null,2);
 q("#v8-diagnostics-report").textContent=report;
}
q("#v8-diagnostics").onclick=diagnostics;q("#v8-diag-copy").onclick=()=>{
 if(navigator.clipboard?.writeText)navigator.clipboard.writeText(report).then(()=>I.toast("Rapor kopyalandı")).catch(()=>I.toast("Panoya erişilemiyor"));
 else I.toast("Panoya kopyalama bu cihazda desteklenmiyor");
};
q("#v8-ui").onchange=e=>{cfg.ui=e.target.value;safe();applyTheme()};
q("#v8-reduce").onchange=e=>{cfg.reduce=e.target.checked;safe();applyTheme()};
q("#v8-library-open").onclick=()=>I.tab("sources");
q("#v8-library-refresh").onclick=()=>{window.DTV7?.refreshLibrary();I.toast("Müzik listesi güncellendi")};
q("#v8-driving").onclick=()=>q("#v6-drive-open")?.click();
q("#v8-voice").onclick=()=>{if(!native())I.toast("Ses komutları Android APK'da kullanılabilir");else{q("#v8-voice-status").textContent="Dinleniyor…";call("startVoiceCommand")}};
const voiceResult=text=>{
 const s=String(text).toLocaleLowerCase("tr-TR");
 q("#v8-voice-status").textContent="Anlaşılan: "+s;
 const vol=Number(call("getMediaVolume")||S.volume);
 if(/ses.*(aç|arttır|yükselt)/.test(s))call("setMediaVolume",Math.min(100,vol+8));
 else if(/ses.*(kıs|azalt|düşür)/.test(s))call("setMediaVolume",Math.max(0,vol-8));
 else if(/(sonraki|ileri)/.test(s))call("nativeNext");
 else if(/(önceki|geri)/.test(s))call("nativePrevious");
 else if(/(dur|durdur|beklet)/.test(s))call("nativePause");
 else if(/(oynat|devam)/.test(s))call("nativeToggle");
 else if(/bass/.test(s)){cfg.smartProfile="bass";q("#v8-smart-type").value="bass";q("#v8-smart-apply").click()}
 else I.toast("Komut tanınmadı; ses aç/kıs, sonraki, durdur deneyin");
};
window.DTV8={voiceResult,voiceError:()=>{q("#v8-voice-status").textContent="Ses tanıma başlatılamadı"},syncEQ:sendEQ};
route();diagnostics();applyTheme();setTimeout(()=>{if(cfg.eq)sendEQ()},900);setInterval(()=>{if(!document.hidden)pollEQ()},3200);pollEQ();
q("#dt5-version")&&(q("#dt5-version").textContent="DRIVETONE V8 · STUDIO");
})();
