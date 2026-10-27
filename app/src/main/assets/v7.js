(()=>{"use strict";
const $=s=>document.querySelector(s),I=window.DTInternal;
if(!I)return;
const native=()=>!!window.AndroidBridge;
const invoke=(method,...args)=>I.callNative(method,...args);
const panel=document.createElement("section");panel.id="v7-library";
panel.innerHTML='<div class="v7-head"><div><span>DRIVETONE / NATIVE</span><h2>Kalıcı Müzik Kütüphanesi</h2><p>Seçtiğin dosyalar tekrar açılışta kaybolmaz. Android Media3 üzerinden ekran kapalıyken dinleyebilirsin. 28 bant EQ aşağıdaki yerel müzik oynatıcısında çalışır.</p></div><span class="v7-pill" id="v7-status">Bağlanıyor…</span></div><div class="v7-controls"><button id="v7-refresh">↻ Güncelle</button><button id="v7-clear">Tümünü sil</button></div><div class="v7-now"><div class="v7-now-icon">♫</div><div><span>ŞİMDİ ÇALAN</span><strong id="v7-title">Henüz parça seçilmedi</strong><small id="v7-time">--:-- / --:--</small></div></div><input type="range" id="v7-seek" min="0" max="1000" value="0" aria-label="Parçada ilerle"><div class="v7-player"><button id="v7-prev" aria-label="Önceki">⏮</button><button id="v7-toggle" aria-label="Oynat veya duraklat">▶</button><button id="v7-next" aria-label="Sonraki">⏭</button></div><div class="v7-list" id="v7-list"><p>Müzik kütüphanesi yükleniyor…</p></div>';
const sources=$("#sources"),body=sources?.querySelector(".page-content")||sources;
if(body)body.prepend(panel);
document.head.insertAdjacentHTML("beforeend",'<style>'+
'#v7-library{margin:0 0 25px;padding:20px 16px 16px;border-radius:23px;background:linear-gradient(145deg,#1b2028,#12161c);color:#fff;box-shadow:0 12px 35px #0002;min-width:0}#v7-library .v7-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}#v7-library .v7-head>div{min-width:0}#v7-library .v7-head span{font-size:9px;letter-spacing:1.5px;color:#b7a4a9}#v7-library h2{margin:8px 0 4px;font-size:20px;color:#fff;letter-spacing:-.5px}#v7-library p{font-size:11px;line-height:1.7;color:#b9bdc3;margin:5px 0}#v7-library .v7-pill{border:1px solid #3b464f;border-radius:30px;padding:8px;color:#b5d6be;font-size:10px;white-space:nowrap}#v7-library .v7-controls{display:flex;gap:7px;margin:16px 0}#v7-library button{background:#333944;border:1px solid #454c56;color:#fff;border-radius:12px;min-height:44px;cursor:pointer}#v7-library .v7-controls button{padding:10px 14px;flex:1;font-size:11px;font-weight:650}#v7-library .v7-now{display:flex;gap:12px;align-items:center;background:#282e37;border:1px solid #373e46;border-radius:16px;padding:12px;margin-bottom:16px}#v7-library .v7-now-icon{width:43px;height:43px;flex:none;border-radius:13px;display:grid;place-items:center;background:linear-gradient(130deg,#b94e69,#532631);font-size:23px}#v7-library .v7-now>div:last-child{display:flex;flex-direction:column;min-width:0;gap:4px}#v7-library .v7-now span{font-size:9px;letter-spacing:1px;color:#aeb2ba}#v7-library .v7-now strong{font-size:12px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;max-width:230px;color:#fff}#v7-library .v7-now small{font-size:10px;color:#aeb2ba}#v7-library input[type=range]{width:100%;accent-color:#ce6a81}#v7-library .v7-player{display:flex;gap:20px;justify-content:center;margin:10px 0 19px}#v7-library .v7-player button{width:57px;height:57px;font-size:22px}#v7-library .v7-player #v7-toggle{background:#f2f2ed;color:#171a1e;border-color:#f2f2ed;font-size:25px}#v7-library .v7-list{display:grid;gap:8px;max-height:320px;overflow-y:auto}#v7-library .v7-item{display:flex;align-items:center;gap:7px;min-width:0;background:#262b33;border:1px solid #343944;border-radius:13px;min-height:50px}#v7-library .v7-open{flex:1;min-width:0;text-align:left;padding:10px;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#v7-library .v7-remove{width:44px;flex-shrink:0;font-size:19px;color:#f5b8c5}#v7-library .v7-item.is-active{border-color:#b85c74}#v7-library .v7-empty{padding:18px;text-align:center;border:1px dashed #5c6167;border-radius:14px}#v7-library .v7-head p{margin:0 0 5px}'+
'</style>');
const fmt=ms=>{if(!Number.isFinite(ms)||ms<0)return "--:--";const s=Math.floor(ms/1000);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
let tracks=[],playing=false,position=0,duration=0,activeIndex=-1;
function show(){
 const list=$("#v7-list");if(!list)return;
 list.innerHTML=tracks.length?tracks.map((t,i)=>'<div class="v7-item '+(activeIndex===i?"is-active":"")+'"><button class="v7-open" data-v7-play="'+i+'">'+(activeIndex===i?"♪ ":"♫ ")+I.escapeHtml(t.title)+'</button><button class="v7-remove" data-v7-delete="'+i+'" aria-label="Listeden kaldır">×</button></div>').join(""):'<div class="v7-empty"><p>Henüz kalıcı şarkı yok.</p><p>Alt taraftaki “Müzik ekle” ile dosyalarını seç.</p></div>';
 list.querySelectorAll("[data-v7-play]").forEach(b=>b.onclick=()=>{I.audio.pause();invoke("nativePlay",Number(b.dataset.v7Play))});
 list.querySelectorAll("[data-v7-delete]").forEach(b=>b.onclick=()=>{invoke("nativeRemove",Number(b.dataset.v7Delete));refreshLibrary()});
 $("#v7-status").textContent=native()?tracks.length+" parça kayıtlı":"Android uygulamasında aç";
 $("#v7-title").textContent=activeIndex>=0?tracks[activeIndex]?.title||"Parça":"Henüz parça seçilmedi";
 $("#v7-time").textContent=fmt(position)+" / "+fmt(duration);
 $("#v7-toggle").textContent=playing?"Ⅱ":"▶";
 $("#v7-seek").value=duration>0?Math.min(1000,Math.round(position/duration*1000)):0;
}
function refreshLibrary(){if(!native()){tracks=[];show();return}try{const x=JSON.parse(invoke("getNativeLibrary")||"[]");tracks=Array.isArray(x)?x.filter(t=>typeof t.title==="string").slice(0,500):[]}catch{tracks=[]}show()}
function poll(){if(native()){try{const x=JSON.parse(invoke("getNativePlayback")||"{}");if(x.ready){activeIndex=Number.isInteger(x.index)?x.index:-1;position=x.position;duration=x.duration;playing=!!x.playing}else{activeIndex=-1;playing=false}show()}catch{}}}
$("#v7-refresh").onclick=refreshLibrary;
$("#v7-clear").onclick=()=>{if(confirm("Kalıcı kütüphaneden tüm müzikleri kaldırmak istiyor musun? Dosyalar telefonundan silinmez.")){invoke("nativeClear");refreshLibrary()}};
$("#v7-toggle").onclick=()=>{I.audio.pause();invoke("nativeToggle")};
$("#v7-prev").onclick=()=>invoke("nativePrevious");
$("#v7-next").onclick=()=>invoke("nativeNext");
$("#v7-seek").onchange=e=>{if(duration>0)invoke("nativeSeek",Math.round(Number(e.target.value)/1000*duration))};
I.audio.addEventListener("play",()=>{if(native())invoke("nativePause")});
const dockVersion=document.querySelector(".v6-dock strong");if(dockVersion)dockVersion.textContent="7";
const footerVersion=$("#dt5-version");if(footerVersion)footerVersion.textContent="DRIVETONE V7 · STUDIO";
window.DTV7={refreshLibrary,nativeReady:()=>{$("#v7-status").textContent="Hazır";refreshLibrary()},nativeError:()=>{$("#v7-status").textContent="Bağlantı başarısız"}};
refreshLibrary();setInterval(poll,1250);
})();
