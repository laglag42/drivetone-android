(()=>{"use strict";
const I=window.DTInternal,C=window.DTV6Core;
if(!I||!C)return;
const {state,audio,toast,renderBands,renderMacros,renderPresets,applyEQ,persist,tab,callNative}=I;
const $=s=>document.querySelector(s);
const saveKey="drivetone:v6";
let conf=C.sanitize((()=>{try{return JSON.parse(localStorage.getItem(saveKey))}catch{return null}})());
const store=()=>{try{localStorage.setItem(saveKey,JSON.stringify(conf))}catch{toast("Ayarlar kaydedilemedi")}};
let activeSource="local",protectedGain=.99;
function card(title,content){return '<section class="v6-panel"><div class="v6-head">'+title+'</div>'+content+'</section>'}
const chip=(id,label)=>'<button type="button" id="'+id+'" class="v6-chip">'+label+'</button>';
const toggleRow=(id,title,explanation,checked)=>'<label class="v6-toggle-row"><span><b>'+title+'</b><small>'+explanation+'</small></span><input id="'+id+'" type="checkbox"'+(checked?" checked":"")+'></label>';
let dock=document.createElement("div");dock.className="v6-dock";dock.innerHTML='<button id="v6-drive-open">◉ SÜRÜŞ MODU</button><span>DRIVETONE <strong>6</strong> · STUDIO</span>';
const main=$(".app-body");if(!main)return;main.insertBefore(dock,main.firstChild);
const home=document.querySelector("#home");
home?.insertAdjacentHTML("beforeend",card("SMART AUDIO ENGINE",
 toggleRow("v6-brain","AI Music Brain","Yerel sesin frekans içeriğini inceleyerek hafif EQ düzeltmesi önerir.",conf.brain)+
 '<label class="v6-field">Müzik profili<select id="v6-genre">'+C.genre.map(x=>'<option value="'+x+'">'+({auto:"Otomatik frekans tepkisi",pop:"Pop",rap:"Rap / Hip-Hop",arabesk:"Arabesk",rock:"Rock",acoustic:"Akustik",electronic:"Elektronik"}[x])+'</option>').join("")+'</select></label>'+
 toggleRow("v6-protect","Smart Bass Protection","Yerel ses için hızlı kazanç sınırlaması; donanımsal hoparlör koruması değildir.",conf.protect)+
 '<div class="v6-indicator" id="v6-monitor" aria-live="off">Müzik seçilince analiz başlar. Harici uygulama sesi analiz edilemez.</div>'));
const cabin=$("#cabin");
cabin?.insertAdjacentHTML("beforeend",card("INTERACTIVE CAR STUDIO",
 '<p class="v6-copy">Araç görselini sürükleyerek döndür, yakınlaştır. Ses odağı için alttaki kontrolleri kullan. Teybin gerçek fader kontrolü henüz bağlı değil.</p>'+
 '<div class="v6-carview" id="v6-carview"><img src="vehicle.svg" alt="Üstten otomobil görünümü" id="v6-carimg"><div class="v6-carname">CAR / 360° PREVIEW</div></div>'+
 '<div class="v6-actions">'+chip("v6-car-left","↶ Döndür")+chip("v6-car-reset","⟲ Ortala")+chip("v6-car-right","Döndür ↷")+'</div>'+
 '<label class="v6-field">Yakınlaştır <input id="v6-zoom" type="range" min="80" max="135" value="100"></label><p class="v6-indicator">Ses çıkışları: görsel simülasyon · Ön/arka teybe gönderilmiyor.</p>'));
$("#settings")?.insertAdjacentHTML("beforeend",card("SMART CONNECT",
 toggleRow("v6-haptic","Haptic Volume Wheel","Android'de metal düğmeyi çevirirken dokunma geri bildirimi.",conf.haptics)+
 toggleRow("v6-safe","Safe Start Volume","Uygulama ilk açıldığında medya sesini belirlediğin üst sınıra indirir.",conf.safeEnabled)+
 '<label class="v6-field">Güvenli başlangıç sınırı <span id="v6-safe-value">%'+conf.safeLimit+'</span><input id="v6-safe-limit" type="range" min="10" max="75" step="5" value="'+conf.safeLimit+'"></label>'+
 '<p class="v6-copy">Yalnızca DRIVETONE açılışında uygulanır. Bluetooth bağlandığında kendiliğinden yüksek ses ayarlamaz.</p>'+
 '<div class="v6-head">SOURCE-BASED PROFILES</div><div id="v6-source-matrix"></div>'+
 '<p class="v6-copy">Harici medya kaynağı tanınabilir; EQ diğer uygulamaların sesine uygulanamaz. Yerel oynatıcıdaki profiller uygulanır.</p>')+
 card("SOUND CALIBRATION WIZARD",
 '<p class="v6-copy">Profesyonel mikrofon kalibrasyonu değildir. Yerel ses test tonu ve konum yönergeleriyle manuel kontrol sağlar.</p>'+
 '<div class="v6-actions">'+chip("v6-test-100","100 Hz TEST")+chip("v6-test-1000","1 kHz TEST")+chip("v6-test-stop","■ DURDUR")+'</div>'+
 '<p class="v6-indicator" id="v6-test-note">Test başlamadı. Sesini önce kıs; yüksek ses seviyesi işitmeye zarar verebilir.</p>'+
 '<div class="v6-actions">'+chip("v6-cal-center","Dengeyi merkezle")+chip("v6-cal-eq","EQ'yu sıfırla")+'</div>'));
document.body.insertAdjacentHTML("beforeend",'<div id="v6-drive" class="v6-drive" hidden role="dialog" aria-modal="true" aria-label="Sürüş modu"><header><b>DRIVETONE / DRIVE</b>'+chip("v6-drive-close","ÇIKIŞ ✕")+'</header><p>Telefon medya sesi</p><div id="v6-drive-number">--</div><div class="v6-drive-controls">'+chip("v6-drive-minus","−")+chip("v6-drive-plus","+ ")+'</div><div class="v6-drive-controls">'+chip("v6-drive-prev","⏮")+chip("v6-drive-play","⏯")+chip("v6-drive-next","⏭")+'</div><div class="v6-actions">'+chip("v6-drive-natural","NATURAL")+chip("v6-drive-bass","BASS PLUS")+'</div><small id="v6-drive-info">Ses ve medya kontrolleri. Araç kullanırken telefon ekranına bakma.</small></div>');
document.head.insertAdjacentHTML("beforeend",'<style>'+
'.v6-dock{display:flex;justify-content:space-between;align-items:center;gap:9px;background:#181b23;color:#fff;border-radius:16px;padding:10px 12px;margin-bottom:15px;font-size:10px;letter-spacing:1px}.v6-dock strong{color:#f1abb7}.v6-dock button{background:#fff;color:#161a21;padding:10px 12px;border-radius:11px;font-size:10px;font-weight:850}'+
'.v6-panel{margin:19px 0;padding:18px 15px;background:var(--card);border:1px solid var(--line);border-radius:20px;min-width:0}.v6-head{font-size:12px;letter-spacing:1.2px;font-weight:850;margin:2px 0 14px}.v6-toggle-row{display:flex;gap:14px;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--line)}.v6-toggle-row b{font-size:13px}.v6-toggle-row small{display:block;font-size:11px;line-height:1.5;color:var(--muted);margin-top:5px}.v6-toggle-row input{width:24px;height:24px;flex-shrink:0;accent-color:var(--accent)}.v6-field{display:block;font-size:12px;font-weight:700;margin:16px 0;color:var(--ink)}.v6-field select,.v6-field input{display:block;width:100%;padding:12px;margin-top:8px;border-radius:10px;border:1px solid var(--line);background:var(--paper);color:var(--ink)}.v6-field input[type=range]{padding:0}.v6-copy{line-height:1.65;font-size:11px;color:var(--muted)}.v6-indicator{border-radius:11px;padding:12px;margin:10px 0;background:var(--soft);font-size:11px;line-height:1.5;color:var(--ink)}.v6-actions{display:flex;gap:7px;flex-wrap:wrap}.v6-chip{border:1px solid var(--line);background:var(--paper);border-radius:12px;font-weight:800;font-size:11px;min-height:44px;padding:10px 12px;flex:1 1 auto}.v6-carview{touch-action:pan-y;display:grid;place-items:center;position:relative;height:290px;background:radial-gradient(ellipse at center,#3d4551,#131822 70%);border-radius:18px;overflow:hidden}.v6-carview img{object-fit:contain;height:230px;max-width:80%;transition:transform .2s;filter:drop-shadow(0 13px 17px #0009)}.v6-carname{position:absolute;bottom:13px;color:#fff8;font-size:9px;letter-spacing:2px}.v6-drive[hidden]{display:none}.v6-drive{position:fixed;z-index:99999;inset:0;padding:calc(env(safe-area-inset-top) + 18px) 20px calc(env(safe-area-inset-bottom) + 22px);background:#101318;color:#fff;display:flex;flex-direction:column;justify-content:space-around;align-items:center;text-align:center;overflow-y:auto}.v6-drive header{width:100%;display:flex;justify-content:space-between;gap:10px;align-items:center}.v6-drive header button{color:#fff}.v6-drive p{color:#a9abb1;font-size:12px}.v6-drive-number{font-size:clamp(80px,22vw,130px);font-weight:850;line-height:1}.v6-drive-controls{display:flex;gap:18px;width:100%;justify-content:center}.v6-drive-controls button{font-size:34px;color:#fff;border-radius:24px;background:#292e38;min-width:85px;min-height:84px}.v6-drive .v6-actions{width:100%}.v6-drive .v6-actions button{color:#fff;background:#292e38}.v6-drive small{font-size:11px;color:#adb0b7;line-height:1.6}.v6-drive button:focus-visible{outline:3px solid #f3aec1}@media(max-width:325px){.v6-panel{padding:12px}.v6-drive-controls button{min-width:65px}}'+
'</style>');
const by=id=>document.getElementById(id);
const bind=(id,fn)=>{const el=by(id);if(el)el.addEventListener("click",fn)};
const bindCheck=(id,key)=>{const el=by(id);if(!el)return;el.addEventListener("change",()=>{conf[key]=el.checked;store();if(key==="protect"||key==="brain")window.DTV6Runtime?.updateProcessing();toast(el.checked?"Etkin":"Devre dışı")})};
bindCheck("v6-brain","brain");bindCheck("v6-protect","protect");bindCheck("v6-haptic","haptics");bindCheck("v6-safe","safeEnabled");
by("v6-genre").value=conf.brainGenre;by("v6-genre").onchange=e=>{conf.brainGenre=e.target.value;store();toast("Akıllı tür profili: "+e.target.selectedOptions[0].textContent)};
by("v6-safe-limit").oninput=e=>{conf.safeLimit=Number(e.target.value);by("v6-safe-value").textContent="%"+conf.safeLimit;store()};
let angle=0,zoom=100;function moveCar(){by("v6-carimg").style.transform="perspective(620px) rotateY("+angle+"deg) rotateX(8deg) scale("+(zoom/100)+")"}
bind("v6-car-left",()=>{angle=Math.max(-65,angle-15);moveCar()});bind("v6-car-right",()=>{angle=Math.min(65,angle+15);moveCar()});bind("v6-car-reset",()=>{angle=0;zoom=100;by("v6-zoom").value="100";moveCar()});
by("v6-zoom").oninput=e=>{zoom=Number(e.target.value);moveCar()};
let touchX=null;by("v6-carview").addEventListener("pointerdown",e=>{touchX=e.clientX});
by("v6-carview").addEventListener("pointerup",e=>{if(touchX!==null){angle=C.clamp(angle+(e.clientX-touchX)*.35,-65,65);moveCar();touchX=null}});
function sourceMedia(pkg){activeSource=C.detectSource(pkg);document.querySelectorAll(".v6-source-pill").forEach(x=>x.classList.toggle("active",x.dataset.source===activeSource))}
const validPresets=["Natural","Bass Plus","Pop","Vokal","Elektronik","Arabesk","Rock","Gece","Kişisel"];
const srcLabels={local:"Yerel",spotify:"Spotify",youtube:"YouTube",ytmusic:"YouTube Music",other:"Diğer"};
const matrix=by("v6-source-matrix");
matrix.innerHTML=C.sources.map(key=>'<label class="v6-field">'+srcLabels[key]+'<select class="v6-source-select" data-key="'+key+'"><option value="">Varsayılan</option>'+validPresets.map(p=>'<option>'+p+'</option>').join("")+'</select></label>').join("");
matrix.querySelectorAll("select").forEach(el=>{el.value=conf.profiles[el.dataset.key]||"";el.onchange=()=>{if(el.value)conf.profiles[el.dataset.key]=el.value;else delete conf.profiles[el.dataset.key];store();toast("Kaynak profili kaydedildi")}});
const localProfile=()=>{const p=conf.profiles.local;if(p){const button=document.querySelector('[data-preset="'+p+'"]');if(button)button.click()}};
const openDrive=()=>{by("v6-drive").hidden=false;by("v6-drive-number").textContent=state.volume;by("v6-drive-close").focus()};
bind("v6-drive-open",openDrive);bind("v6-drive-close",()=>{by("v6-drive").hidden=true;by("v6-drive-open").focus()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!by("v6-drive").hidden)by("v6-drive-close").click()});
const setVol=v=>{const old=state.volume;const delta=C.clamp(v,0,state.maxVolume);const dial=by("dial");if(dial){const event=null;const b=by("volumeValue");const minus=document.querySelector(".volume-action button:first-child");const plus=document.querySelector(".volume-action button:last-child");if(delta>old&&plus)for(let i=old;i<delta;i++)plus.click();else if(delta<old&&minus)for(let i=old;i>delta;i--)minus.click()}by("v6-drive-number").textContent=state.volume};
bind("v6-drive-minus",()=>setVol(state.volume-4));bind("v6-drive-plus",()=>setVol(state.volume+4));
bind("v6-drive-prev",()=>document.querySelector(".player-controls button:first-child")?.click());bind("v6-drive-next",()=>document.querySelector(".player-controls button:last-child")?.click());bind("v6-drive-play",()=>document.querySelector(".player-controls .playbtn")?.click());
bind("v6-drive-natural",()=>{by("v6-drive-close").click();I.tab("eq");document.querySelector('[data-preset="Natural"]')?.click();openDrive()});
bind("v6-drive-bass",()=>{by("v6-drive-close").click();I.tab("eq");document.querySelector('[data-preset="Bass Plus"]')?.click();openDrive()});
let toneOsc=null,toneGain=null;function stopTone(){try{toneOsc?.stop()}catch{}toneOsc=null;try{toneGain?.disconnect()}catch{}toneGain=null};
function tone(freq){stopTone();try{const ac=new(window.AudioContext||window.webkitAudioContext)();toneOsc=ac.createOscillator();toneGain=ac.createGain();toneGain.gain.value=.015;toneOsc.frequency.value=freq;toneOsc.type="sine";toneOsc.connect(toneGain);toneGain.connect(ac.destination);toneOsc.start();setTimeout(()=>{stopTone();ac.close().catch(()=>{})},1400);by("v6-test-note").textContent=freq+" Hz yerel test tonu (1,4 sn). Sesi düşük tut."}catch{toast("Ses testi desteklenmiyor")}};
bind("v6-test-100",()=>tone(100));bind("v6-test-1000",()=>tone(1000));bind("v6-test-stop",()=>{stopTone();by("v6-test-note").textContent="Test durduruldu"});
bind("v6-cal-center",()=>by("centerStage")?.click());bind("v6-cal-eq",()=>by("resetEq")?.click());
if(conf.safeEnabled&&window.AndroidBridge){const now=Number(callNative("getMediaVolume"));const target=C.safeStartVolume(now,true,conf.safeLimit);if(Number.isFinite(now)&&target<now){callNative("setMediaVolume",Math.round(target));toast("Güvenli başlangıç sesi: %"+Math.round(target))}}
let lastHaptic=0;
by("dial")?.addEventListener("pointermove",e=>{if(!conf.haptics||!(e.buttons&1)||Date.now()-lastHaptic<95)return;lastHaptic=Date.now();callNative("hapticTick")},{passive:true});
let analyser=null,ctx=null,gain=null,smooth=1,low=0,mid=0;function attachProcessing(context,analyserNode,boostNode){ctx=context;analyser=analyserNode;gain=boostNode};
const cfg={get brain(){return conf.brain},get protect(){return conf.protect},get genre(){return conf.brainGenre},get offset(){return C.makeOffsets(conf.brainGenre,low,mid)}};
let lastTick=0;
function updateProcessing(){
 if(!ctx||!analyser)return;
 const data=new Uint8Array(analyser.frequencyBinCount);analyser.getByteFrequencyData(data);
 if(data.length){const limit=Math.min(28,data.length);let sum=0;for(let i=0;i<limit;i++)sum+=data[i];low=sum/Math.max(1,limit);sum=0;for(let i=limit;i<Math.min(130,data.length);i++)sum+=data[i];mid=sum/Math.max(1,Math.min(130,data.length)-limit)}
 const peakData=new Float32Array(analyser.fftSize);if(analyser.getFloatTimeDomainData)analyser.getFloatTimeDomainData(peakData);
 let peak=0;for(let i=0;i<peakData.length;i++)peak=Math.max(peak,Math.abs(peakData[i]));
 smooth=conf.protect?C.protectFromPeak(peak,smooth):1;
 if(gain&&ctx)gain.gain.setTargetAtTime(smooth,ctx.currentTime,.06);
 if(Date.now()-lastTick>550){by("v6-monitor").textContent="YEREL ANALİZ · Alt frekans "+Math.round(low/255*100)+"% · Orta frekans "+Math.round(mid/255*100)+"% · Tepe "+Math.round(peak*100)+"% · Güvenli çarpan "+smooth.toFixed(2);lastTick=Date.now()}
}
let loop;
function scan(){if(!document.hidden&&!audio.paused&&!audio.ended)updateProcessing();loop=setTimeout(scan,210)}scan();
window.DTV6Runtime={attachProcessing,updateProcessing,getEQOffset:()=>conf.brain?cfg.offset:Array(28).fill(0),sourceMedia,sourceLocal:localProfile,onFileLoaded:()=>{activeSource="local";localProfile()},getConfig:()=>structuredClone(conf)};
let prevMedia=window.DRIVETONE?.onMediaUpdate;
if(window.DRIVETONE)window.DRIVETONE.onMediaUpdate=function(data){try{const m=typeof data==="string"?JSON.parse(data):data;sourceMedia(m?.packageName||"")}catch{}return prevMedia?.call(this,data)};
by("dt5-version")&&(by("dt5-version").textContent="DRIVETONE V6 · STUDIO");
})();
