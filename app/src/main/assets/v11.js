(()=>{"use strict";const I=window.DTInternal;if(!I)return;
const $=s=>document.querySelector(s),call=(n,...a)=>I.callNative(n,...a),android=()=>!!window.AndroidBridge;
const esc=I.escapeHtml;
const prefs=(()=>{try{return JSON.parse(localStorage.getItem("dt:v11"))||{}}catch{return {}}})();
const conf={fade:[0,2,4,8].includes(prefs.fade)?prefs.fade:0,normalize:!!prefs.normalize,deviceProfiles:prefs.deviceProfiles&&typeof prefs.deviceProfiles==="object"?prefs.deviceProfiles:{}};
const persist=()=>{try{localStorage.setItem("dt:v11",JSON.stringify(conf))}catch{}};
let tracks=[],queue=[],cover="",lastDevice="",playback=null;
const wrap=document.createElement("div");wrap.id="v11-studio";
wrap.innerHTML='<div id="v11-modal" hidden><div class="v11-top"><b>DRIVETONE / NOW PLAYING</b><button id="v11-close">✕</button></div><div id="v11-art">♫</div><p id="v11-name">Müzik seçilmedi</p><p id="v11-artist">Yerel müzik · Android Media3</p><div id="v11-wave"></div><div id="v11-position">0:00 / 0:00</div><input id="v11-seek" type="range" min="0" max="1000" value="0" aria-label="İlerleme"><div class="v11-buttons"><button id="v11-prev">⏮</button><button id="v11-play">▶</button><button id="v11-next">⏭</button></div><div class="v11-note">Yerel medya bilgileri • dalga animasyonu gerçek spektrum ölçümü değildir</div></div>';
document.body.append(wrap);
const sources=$("#sources"),settings=$("#settings");
sources?.insertAdjacentHTML("beforeend",'<section class="v11-panel"><h2>V11 / NOW PLAYING</h2><button id="v11-open">⛶ Premium tam ekran oynatıcı</button><h3>Sıradaki Şarkılar</h3><p>Kuyruğu taşı, şarkı çıkar ve devam eden listeyi düzenle.</p><button id="v11-refresh">↻ Kuyruğu yenile</button><div id="v11-queue"></div></section>');
settings?.insertAdjacentHTML("beforeend",'<section class="v11-panel"><h2>V11 / AUDIO STUDIO</h2><p>Android yerel müzik için gerçek iki oynatıcılı geçiş. Karışık çalma ve 1× dışındaki hızlarda geçiş kullanılmaz.</p><label>Crossfade süresi <select id="v11-fade"><option value="0">Kapalı</option><option value="2">2 saniye</option><option value="4">4 saniye</option><option value="8">8 saniye</option></select></label><label class="v11-check"><input type="checkbox" id="v11-normalize"> Dinamik ses eşitleme</label><p>Dinamik sıkıştırma, şarkı başına LUFS ölçümü değildir; yalnızca bu uygulamanın Media3 sesine uygulanır.</p><div id="v11-effect-state">Etkin efektler okunuyor…</div><h3>Bluetooth Cihaz Profilleri</h3><p>Android üzerinden algılanan medya çıkışının adına göre kayıtlı EQ profili seçilir. Gerçek FOR-X DSP kontrolü değildir.</p><button id="v11-profile-save">Mevcut EQ’yu bu cihaz için kaydet</button><button id="v11-profile-off">Bu cihazın profilini sil</button><div id="v11-device">Cihaz kontrol ediliyor</div></section>');
document.head.insertAdjacentHTML("beforeend",'<style>#v11-modal[hidden]{display:none}#v11-modal{position:fixed;z-index:99998;inset:0;background:radial-gradient(circle at 50% 28%,#3e202c,#11141a 70%);color:white;display:flex;flex-direction:column;align-items:center;gap:15px;padding:calc(20px + env(safe-area-inset-top)) 22px calc(15px + env(safe-area-inset-bottom));overflow-y:auto}.v11-top{width:100%;display:flex;align-items:center;justify-content:space-between;font-size:11px;letter-spacing:1px}.v11-top button,.v11-buttons button{background:#ffffff20;color:#fff;border:1px solid #ffffff39;border-radius:14px;padding:10px;min-height:48px}#v11-art{width:min(72vw,320px);aspect-ratio:1;border-radius:26px;background:linear-gradient(135deg,#cb627e,#46253b,#172634);display:grid;place-items:center;font-size:84px;box-shadow:0 25px 80px #0008}#v11-name{font-size:24px;font-weight:800;text-align:center;margin:4px 0;overflow-wrap:anywhere}#v11-artist,.v11-note{font-size:11px;color:#c8c5cd;text-align:center}#v11-wave{height:40px;width:100%;background:repeating-linear-gradient(90deg,#e69ab1 0 3px,transparent 3px 8px);mask-image:linear-gradient(to top,transparent,#000)}#v11-position{font-size:11px}#v11-seek{width:100%;accent-color:#e69ab1}.v11-buttons{display:flex;gap:25px}.v11-buttons button{font-size:26px;width:66px}.v11-panel{padding:17px;margin:16px 0;background:var(--card);border:1px solid var(--line);border-radius:20px}.v11-panel h2{font-size:14px;letter-spacing:1px}.v11-panel h3{font-size:13px}.v11-panel p{font-size:11px;line-height:1.6;color:var(--muted)}.v11-panel button,.v11-panel select{border:1px solid var(--line);border-radius:10px;padding:11px;margin:5px;background:var(--paper);color:var(--ink);font-size:11px;min-height:42px}.v11-panel label{display:block;margin:12px 0;font-size:12px}.v11-panel .v11-check input{accent-color:var(--accent)}.v11-q{display:flex;align-items:center;gap:5px;border-bottom:1px solid var(--line);padding:8px 0}.v11-q span{flex:1;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.v11-q button{padding:7px!important;min-height:39px!important}#v11-effect-state,#v11-device{padding:10px;margin:10px 0;border-radius:11px;background:var(--soft);font-size:11px}</style>');
const fmt=n=>{if(!Number.isFinite(n)||n<0)return "0:00";let t=Math.floor(n/1000);return Math.floor(t/60)+":"+String(t%60).padStart(2,"0")};
function effect(){if(!android())return;call("configureV11",conf.fade,conf.normalize);persist()}
$("#v11-fade").value=String(conf.fade);$("#v11-normalize").checked=conf.normalize;
$("#v11-fade").onchange=e=>{conf.fade=Number(e.target.value);effect()};
$("#v11-normalize").onchange=e=>{conf.normalize=e.target.checked;effect()};
$("#v11-open").onclick=()=>{$("#v11-modal").hidden=false;call("setV11Fullscreen",true);I.audio.pause();poll()};
function closePlayer(){$("#v11-modal").hidden=true;call("setV11Fullscreen",false)}
$("#v11-close").onclick=closePlayer;
$("#v11-play").onclick=()=>call("nativeToggle");
$("#v11-prev").onclick=()=>call("nativePrevious");
$("#v11-next").onclick=()=>call("nativeNext");
$("#v11-seek").onchange=e=>{if(playback?.duration>0)call("nativeSeek",Math.round(Number(e.target.value)/1000*playback.duration))};
function queueRender(){
 const el=$("#v11-queue");if(!el)return;
 el.innerHTML=queue.length?queue.map((x,i)=>'<div class="v11-q"><span>'+(x.current?"▶ ":"")+esc(x.title||"Şarkı")+'</span><button data-v11-up="'+i+'" '+(i===0?"disabled":"")+'>↑</button><button data-v11-down="'+i+'" '+(i===queue.length-1?"disabled":"")+'>↓</button><button data-v11-del="'+i+'">×</button></div>').join(""):'<p>Kuyruk boş. Önce müzik kütüphanesinden şarkı başlat.</p>';
 el.querySelectorAll("[data-v11-up]").forEach(b=>b.onclick=()=>move(Number(b.dataset.v11Up),-1));
 el.querySelectorAll("[data-v11-down]").forEach(b=>b.onclick=()=>move(Number(b.dataset.v11Down),1));
 el.querySelectorAll("[data-v11-del]").forEach(b=>b.onclick=()=>{call("nativeQueueRemove",Number(b.dataset.v11Del));setTimeout(refreshQueue,200)});
}
function move(i,d){call("nativeQueueMove",i,i+d);setTimeout(refreshQueue,200)}
function refreshQueue(){try{const data=JSON.parse(call("nativeQueueJson")||"[]");queue=Array.isArray(data)?data.slice(0,150):[]}catch{queue=[]}queueRender()}
$("#v11-refresh").onclick=refreshQueue;
function device(){
 let name="";
 try {
  const raw=JSON.parse(call("getRoutedOutput")||"{}");
  const devices=Array.isArray(raw.devices)?raw.devices.filter(x=>x.category==="Bluetooth"):[];
  if(raw.supported&&devices.length===1)name=String(devices[0].product||"").trim();
 }catch{} 
 // Require an actual named output; do not silently auto-apply on unverified names.
 $("#v11-device").textContent=name?"Algılanan Bluetooth çıkışı: "+name:"Bluetooth çıkışı bulunamadı";
 if(name&&name!==lastDevice&&conf.deviceProfiles[name]){
  const values=conf.deviceProfiles[name];
  if(Array.isArray(values)&&values.length===28&&values.every(x=>Number.isFinite(x)&&x>=-12&&x<=12)){
   I.state.eq=values.slice();I.renderBands();I.renderPresets();I.applyEQ();I.persist();window.DTV8?.syncEQ();I.toast(name+" için EQ profili geri yüklendi");
  }
 }
 lastDevice=name;
 return name;
}
$("#v11-profile-save").onclick=()=>{const name=device();if(!name)return I.toast("Bluetooth cihazı algılanmadı");conf.deviceProfiles[name]=I.state.eq.slice();persist();I.toast("Seçili çıkış için EQ kaydedildi")};
$("#v11-profile-off").onclick=()=>{const name=device();if(!name)return;delete conf.deviceProfiles[name];persist();I.toast("Cihaz profili silindi")};
let lastUri="",counter=0;
function poll(){
 if(!android()||document.hidden)return;
 try{
  playback=JSON.parse(call("getNativePlayback")||"{}");
  if(playback.ready){
    $("#v11-name").textContent=playback.title||"Yerel müzik";
    $("#v11-artist").textContent="DRIVETONE Media3 • Arka planda oynatma";
    $("#v11-position").textContent=fmt(playback.position)+" / "+fmt(playback.duration);
    $("#v11-seek").value=playback.duration>0?Math.round(1000*playback.position/playback.duration):0;
    $("#v11-play").textContent=playback.playing?"Ⅱ":"▶";
    if(playback.uri!==lastUri){lastUri=playback.uri;refreshQueue()}
  }
  if(++counter%4===0){
   const fx=JSON.parse(call("getV11Status")||"{}");
   $("#v11-effect-state").textContent="Crossfade: "+(fx.crossfade||0)+" sn • Ses eşitleme: "+(fx.normalizeState||"bilinmiyor");
   device();
  }
 }catch{}
}
window.DTV11={queueChanged:refreshQueue,closePlayer};
effect();refreshQueue();poll();setInterval(poll,1200);
const label=$("#dt5-version");if(label)label.textContent="DRIVETONE V11 · STUDIO";
const dock=document.querySelector(".v6-dock strong");if(dock)dock.textContent="11";
})();