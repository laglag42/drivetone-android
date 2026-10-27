(()=>{"use strict";
const I=window.DTInternal;if(!I)return;
const q=s=>document.querySelector(s),native=()=>!!window.AndroidBridge,call=(name,...args)=>I.callNative(name,...args);
const KEY="drivetone:v10:collections",MAX_LISTS=20,MAX_ITEMS=80;
const sanitize=d=>{
 const result={favorites:[],recent:[],lists:[]};
 if(!d||typeof d!=="object")return result;
 const strings=a=>Array.isArray(a)?[...new Set(a.filter(x=>typeof x==="string"&&x.startsWith("content://")&&x.length<650))].slice(0,MAX_ITEMS):[];
 result.favorites=strings(d.favorites);result.recent=strings(d.recent);
 if(Array.isArray(d.lists))result.lists=d.lists.slice(0,MAX_LISTS).filter(x=>x&&typeof x.name==="string").map(x=>({name:x.name.trim().slice(0,40),items:strings(x.items)})).filter(x=>x.name);
 return result;
};
let stored;try{stored=sanitize(JSON.parse(localStorage.getItem(KEY)||"{}"))}catch{stored=sanitize({})}
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(stored))}catch{I.toast("Koleksiyonlar kaydedilemedi")}};
let tracks=[];
const esc=I.escapeHtml;
const wrapper=document.createElement("section");wrapper.id="v10-collections";wrapper.innerHTML='<div class="v10-title"><span>DRIVETONE / COLLECTIONS</span><h2>Benim Müziğim</h2><p>Şarkı listelerini, favorileri ve son dinlenenleri telefonunda sakla.</p></div><div class="v10-create"><input id="v10-new-name" maxlength="40" placeholder="Yeni çalma listesi adı" aria-label="Liste adı"><button id="v10-create">Oluştur</button></div><div class="v10-tabs"><button id="v10-tab-favorites">Favoriler</button><button id="v10-tab-recent">Son dinlenenler</button><button id="v10-tab-all">Bütün şarkılar</button></div><div id="v10-custom-list"></div><div id="v10-items"></div><div class="v10-actions"><button id="v10-play">▶ Listeyi oynat</button><button id="v10-shuffle">⤨ Karışık oynat</button></div><p id="v10-status" role="status">Müzikler yükleniyor</p>';
const target=q("#v7-library");if(!target)return;target.insertAdjacentElement("afterend",wrapper);
document.head.insertAdjacentHTML("beforeend",'<style>#v10-collections{margin:18px 0;padding:17px;background:var(--card);border:1px solid var(--line);border-radius:21px}.v10-title span{font-size:9px;letter-spacing:1.6px;color:var(--muted)}.v10-title h2{font-size:19px;margin:6px 0}.v10-title p,#v10-status{font-size:11px;line-height:1.6;color:var(--muted)}.v10-create{display:flex;gap:8px;margin:15px 0}.v10-create input{flex:1;min-width:0;border:1px solid var(--line);background:var(--paper);border-radius:12px;padding:12px;color:var(--ink)}#v10-collections button{border:1px solid var(--line);background:var(--paper);border-radius:10px;padding:10px;color:var(--ink);font-size:11px;min-height:42px}.v10-tabs,.v10-actions{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0}.v10-tabs button,.v10-actions button{flex:1}.v10-active{background:var(--ink)!important;color:var(--card)!important}.v10-head{display:flex;gap:7px;margin:12px 0;align-items:center}.v10-head select{flex:1;min-width:0;background:var(--paper);color:var(--ink);padding:12px;border-radius:12px;border:1px solid var(--line)}.v10-track{display:flex;gap:9px;align-items:center;justify-content:space-between;border-top:1px solid var(--line);min-width:0;padding:8px 0}.v10-track span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.v10-track button{flex:0 0 auto;padding:8px!important;min-height:40px!important}.v10-empty{padding:13px;background:var(--soft);border-radius:10px;font-size:11px;color:var(--muted)}</style>');
let view="favorites",listIndex=0,lastCurrent="";
function sync(){
 if(!native()){tracks=[];return}
 try{const d=JSON.parse(call("getNativeLibrary")||"[]");tracks=Array.isArray(d)?d.filter(t=>typeof t.uri==="string"&&typeof t.title==="string").slice(0,500):[]}catch{tracks=[]}
 const available=new Set(tracks.map(t=>t.uri));
 stored.favorites=stored.favorites.filter(x=>available.has(x));stored.recent=stored.recent.filter(x=>available.has(x));
 stored.lists.forEach(l=>{l.items=l.items.filter(x=>available.has(x))});
 persist();
}
const playingIndices=()=>{let u=view==="favorites"?stored.favorites:view==="recent"?stored.recent:view==="all"?tracks.map(t=>t.uri):stored.lists[listIndex]?.items||[];return [...new Set(u.map(uri=>tracks.findIndex(t=>t.uri===uri)).filter(i=>i>=0))].slice(0,MAX_ITEMS)};
function draw(){
 q("#v10-tab-favorites").classList.toggle("v10-active",view==="favorites");
 q("#v10-tab-recent").classList.toggle("v10-active",view==="recent");
 q("#v10-tab-all").classList.toggle("v10-active",view==="all");
 const container=q("#v10-custom-list");
 container.innerHTML='<div class="v10-head"><select id="v10-select"><option value="">Çalma listesi seç</option>'+stored.lists.map((l,i)=>'<option value="'+i+'">'+esc(l.name)+'</option>').join("")+'</select><button id="v10-delete">Listeyi sil</button></div>';
 const sel=q("#v10-select");sel.value=view==="list"?String(listIndex):"";
 sel.onchange=()=>{if(sel.value!==""){view="list";listIndex=Number(sel.value)}else view="all";draw()};
 q("#v10-delete").onclick=()=>{if(view!=="list"||!stored.lists[listIndex])return;if(!confirm("Çalma listesi silinsin mi? Müzik dosyaları silinmez."))return;stored.lists.splice(listIndex,1);listIndex=0;view="all";persist();draw()};
 const items=playingIndices();
 q("#v10-status").textContent=(native()?"":"Yalnızca Android APK'da çalışır · ")+tracks.length+" kayıtlı şarkı · "+items.length+" seçili";
 const box=q("#v10-items");
 const listing=view==="all"?tracks.slice(0,100).map((t,i)=>({t,i})):items.map(i=>({t:tracks[i],i}));
 box.innerHTML=listing.length?listing.map(({t,i})=>'<div class="v10-track"><span title="'+esc(t.title)+'">♫ '+esc(t.title)+'</span><button data-v10-fav="'+i+'">'+(stored.favorites.includes(t.uri)?"♥":"♡")+'</button>'+(view==="list"?'<button data-v10-remove="'+i+'">Çıkar</button>':'<button data-v10-add="'+i+'">Listeye ekle</button>')+'</div>').join(""):'<p class="v10-empty">Bu görünümde henüz şarkı yok.</p>';
 box.querySelectorAll("[data-v10-fav]").forEach(b=>b.onclick=()=>{const uri=tracks[Number(b.dataset.v10Fav)]?.uri;if(!uri)return;stored.favorites=stored.favorites.includes(uri)?stored.favorites.filter(x=>x!==uri):stored.favorites.concat(uri).slice(-MAX_ITEMS);persist();draw()});
 box.querySelectorAll("[data-v10-add]").forEach(b=>b.onclick=()=>{const uri=tracks[Number(b.dataset.v10Add)]?.uri;if(!uri)return;if(!stored.lists.length){I.toast("Önce bir çalma listesi oluştur");return}const l=stored.lists[listIndex]||stored.lists[0];if(l.items.includes(uri))return;if(l.items.length>=MAX_ITEMS){I.toast("Liste en fazla 80 şarkı alır");return}l.items.push(uri);persist();I.toast(l.name+" listesine eklendi")});
 box.querySelectorAll("[data-v10-remove]").forEach(b=>b.onclick=()=>{const uri=tracks[Number(b.dataset.v10Remove)]?.uri;const l=stored.lists[listIndex];if(!l||!uri)return;l.items=l.items.filter(x=>x!==uri);persist();draw()});
}
q("#v10-create").onclick=()=>{const name=q("#v10-new-name").value.trim().slice(0,40);if(!name)return I.toast("Listeye bir ad yaz");if(stored.lists.length>=MAX_LISTS)return I.toast("En fazla 20 liste oluşturulabilir");stored.lists.push({name,items:[]});listIndex=stored.lists.length-1;view="list";q("#v10-new-name").value="";persist();draw()};
["favorites","recent","all"].forEach(x=>q("#v10-tab-"+x).onclick=()=>{view=x;draw()});
function play(shuffle){if(!native())return I.toast("Android APK'da kullanılabilir");sync();const ids=playingIndices();if(!ids.length)return I.toast("Önce şarkı ekle");I.audio.pause();if(!call("nativePlayCollection",JSON.stringify(ids),!!shuffle))I.toast("Liste Android oynatıcısına aktarılamadı")};
q("#v10-play").onclick=()=>play(false);q("#v10-shuffle").onclick=()=>play(true);
function poll(){if(!native()||document.hidden)return;try{const p=JSON.parse(call("getNativePlayback")||"{}");if(!p.playing||!p.uri||p.uri===lastCurrent)return;lastCurrent=p.uri;if(tracks.some(t=>t.uri===p.uri)){stored.recent=[p.uri,...stored.recent.filter(x=>x!==p.uri)].slice(0,MAX_ITEMS);persist();if(view==="recent")draw()}}catch{}}
window.DTV10={refresh:()=>{sync();draw()},playbackError:()=>I.toast("Android bu listeyi başlatamadı")};
sync();draw();setInterval(poll,2500);
const version=document.querySelector("#dt5-version");if(version)version.textContent="DRIVETONE V10 · STUDIO";
const dock=document.querySelector(".v6-dock strong");if(dock)dock.textContent="10";
})();
