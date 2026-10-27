
(()=>{"use strict";
const api=window.DTInternal;
if(!api)return;
const {state,audio,toast,renderPresets,renderBands,renderMacros,applyEQ,persist,playSelected,tab,escapeHtml}=api;
const $=q=>document.querySelector(q), $$=q=>[...document.querySelectorAll(q)];
const safeJSON=(k,otherwise)=>{try{const x=JSON.parse(localStorage.getItem(k));return x??otherwise}catch{return otherwise}};
const prefs=safeJSON("dt5:preferences",{});
const settings={
 shuffle:prefs.shuffle===true,
 repeat:["off","all","one"].includes(prefs.repeat)?prefs.repeat:"off",
 speed:[.75,1,1.25,1.5].includes(prefs.speed)?prefs.speed:1,
 favoriteFilter:false,
 search:"",
 eqBypass:false,
 sleepDeadline:0,
 favorites:new Set(Array.isArray(safeJSON("dt5:favorites",[]))?safeJSON("dt5:favorites",[]).filter(x=>typeof x==="string").slice(0,500):[]),
 trackEQ:safeJSON("dt5:trackeq",{})
};
if(!settings.trackEQ||typeof settings.trackEQ!=="object"||Array.isArray(settings.trackEQ))settings.trackEQ={};
const saveSettings=()=>{try{localStorage.setItem("dt5:preferences",JSON.stringify({shuffle:settings.shuffle,repeat:settings.repeat,speed:settings.speed}));localStorage.setItem("dt5:favorites",JSON.stringify([...settings.favorites].slice(0,500)));localStorage.setItem("dt5:trackeq",JSON.stringify(settings.trackEQ))}catch{toast("Telefonun kayıt alanı dolu veya kapalı")}};
const keyOf=f=>(f?.name||f?.title||"")+"|"+(f?.size||0)+"|"+(f?.lastModified||0);
const getCurrent=()=>state.files[state.fileIndex];
function onTrackChange(item){
  audio.playbackRate=settings.speed;
  const k=keyOf(item), saved=settings.trackEQ[k];
  if(Array.isArray(saved)&&saved.length===28&&saved.every(n=>typeof n==="number"&&Number.isFinite(n)&&n>=-12&&n<=12)){
    state.eq=saved.slice();state.preset="Özel";
    renderBands();renderMacros();renderPresets();applyEQ();persist();
    toast("Bu şarkı için kayıtlı EQ geri yüklendi");
  }
  updateNow();
}
function updateNow(){
  const f=getCurrent(),k=f?keyOf(f):"";
  const b=$("#dt5-favorite-current");
  if(b){b.textContent=f&&settings.favorites.has(k)?"♥ Favorilerimde":"♡ Favorilere ekle";b.disabled=!f;b.setAttribute("aria-pressed",String(!!f&&settings.favorites.has(k)))}
  const p=$("#dt5-track-profile-status");
  if(p)p.textContent=f?(settings.trackEQ[k]?"Bu şarkının özel ses ayarı kayıtlı":"Bu şarkı için henüz özel ayar yok"):"Önce müzik seç";
  const r=$("#dt5-playback-caption");
  if(r)r.textContent="Karıştır "+(settings.shuffle?"açık":"kapalı")+" · Tekrar "+({off:"kapalı",all:"liste",one:"şarkı"}[settings.repeat]);
}
function setShuffle(v){settings.shuffle=v;const b=$("#dt5-shuffle");if(b){b.classList.toggle("selected",v);b.setAttribute("aria-pressed",String(v))}saveSettings();updateNow();toast(v?"Karışık çalma açık":"Sıralı çalma açık")}
function cycleRepeat(){settings.repeat=({off:"all",all:"one",one:"off"})[settings.repeat];const b=$("#dt5-repeat");if(b){b.textContent=({off:"Tekrar kapalı",all:"Listeyi tekrarla",one:"Şarkıyı tekrarla"})[settings.repeat];b.setAttribute("aria-label","Tekrar modu: "+settings.repeat)}saveSettings();updateNow()}
function randomIndex(){
 const n=state.files.length;
 if(n<=1)return n===1?0:-1;
 const k=Math.floor(Math.random()*(n-1));
 return k>=state.fileIndex?k+1:k;
}
function onEnded(){
 const n=state.files.length;
 if(n===0)return;
 if(settings.repeat==="one"){audio.currentTime=0;audio.play().catch(()=>toast("Yeniden oynatma başlatılamadı"));return}
 if(settings.shuffle){playSelected(randomIndex());return}
 const next=state.fileIndex+1;
 if(next<n){playSelected(next);return}
 if(settings.repeat==="all"){playSelected(0);return}
 audio.pause();audio.currentTime=0;toast("Oynatma listesi tamamlandı");
}
function resolveNext(dir,i,n){
 if(!n)return -1;
 if(settings.shuffle&&dir>0)return randomIndex();
 return (i+dir+n)%n;
}
function renderFiles(){
 const list=$("#fileList");if(!list)return;
 const search=settings.search.toLocaleLowerCase("tr-TR").trim();
 const rows=state.files.map((file,index)=>({...file,index})).filter(f=>{
  if(settings.favoriteFilter&&!settings.favorites.has(keyOf(f)))return false;
  return !search||f.title.toLocaleLowerCase("tr-TR").includes(search);
 });
 $("#fileCount").textContent=state.files.length+" PARÇA";
 const result=$("#dt5-search-result");if(result)result.textContent=rows.length+" sonuç · Müzikler telefondan seçildiğinde kullanılabilir";
 list.innerHTML=rows.length?rows.map(f=>{
  const active=f.index===state.fileIndex;
  const liked=settings.favorites.has(keyOf(f));
  return '<div class="dt5-trackrow '+(active?"playing":"")+'"><button class="dt5-track-open" data-file="'+f.index+'"><span class="dt5-trackbadge">♫</span><span class="dt5-trackdesc"><b>'+escapeHtml(f.title)+'</b><small>'+escapeHtml(f.extension)+' · '+(f.size/1048576).toFixed(1)+' MB</small></span><span class="dt5-trackarrow">›</span></button><button class="dt5-heart" data-heart="'+f.index+'" aria-label="'+(liked?"Favorilerden çıkar":"Favorilere ekle")+'" aria-pressed="'+liked+'">'+(liked?"♥":"♡")+'</button></div>';
 }).join(""):'<div class="dt5-empty"><b>'+(state.files.length?"Eşleşen parça yok":"Henüz müzik eklenmedi")+'</b><p>'+(state.files.length?"Aramayı veya favori filtresini temizle.":"Telefonundan MP3, WAV veya desteklenen diğer müzikleri ekle.")+'</p></div>';
 $$("[data-file]").forEach(btn=>btn.onclick=()=>playSelected(Number(btn.dataset.file)));
 $$("[data-heart]").forEach(btn=>btn.onclick=()=>toggleFavorite(Number(btn.dataset.heart)));
 updateNow();
}
function toggleFavorite(i){
 const f=state.files[i];if(!f)return;
 const k=keyOf(f);
 settings.favorites.has(k)?settings.favorites.delete(k):settings.favorites.add(k);
 saveSettings();renderFiles();
 toast(settings.favorites.has(k)?"Favorilere eklendi":"Favorilerden çıkarıldı");
}
function saveTrackEQ(){
 const f=getCurrent();if(!f){toast("Önce müzik dosyası seç");tab("sources");return}
 const k=keyOf(f);
 if(Object.keys(settings.trackEQ).length>=200&&!settings.trackEQ[k]){toast("En fazla 200 parçaya özel EQ saklanabilir");return}
 settings.trackEQ[k]=state.eq.slice();saveSettings();updateNow();toast("Şarkıya özel 28 bant EQ kaydedildi");
}
function removeTrackEQ(){
 const f=getCurrent();if(!f)return;
 delete settings.trackEQ[keyOf(f)];saveSettings();updateNow();toast("Şarkının kayıtlı EQ ayarı silindi");
}
function eqCompare(){
 settings.eqBypass=!settings.eqBypass;
 applyEQ();
 const b=$("#dt5-ab");if(b){b.textContent=settings.eqBypass?"A / Düz ses":"B / EQ etkisi";b.classList.toggle("selected",settings.eqBypass);b.setAttribute("aria-pressed",String(settings.eqBypass))}
 const d=$("#dt5-ab-desc");if(d)d.textContent=settings.eqBypass?"EQ geçici olarak sıfır dB. Ayarların saklı, tekrar dokunarak geri dön.":"Şu anda seçilen 28 bant ayarı sese uygulanıyor.";
 toast(settings.eqBypass?"EQ geçici olarak devre dışı":"EQ tekrar etkin");
}
function downloadJSON(filename,content){
 const blob=new Blob([content],{type:"application/json;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function exportEQ(){
 const payload={type:"drivetone.eq",version:1,preset:state.preset,bands:state.eq.slice(),sub:state.sub,exportedAt:new Date().toISOString()};
 const content=JSON.stringify(payload,null,2);
 if(window.AndroidBridge&&typeof window.AndroidBridge.saveProfileJson==="function"){
  const result=api.callNative("saveProfileJson",content);
  if(typeof result==="string"&&result.startsWith("OK:"))toast("Profil İndirilenler'e kaydedildi");
  else if(result==="SHARED")toast("Profil paylaşım penceresi açıldı");
  else toast("Profil dışa aktarılamadı: "+String(result||"bilinmeyen hata"));
 }else{downloadJSON("drivetone-eq-"+Date.now()+".json",content);toast("EQ profili dışa aktarıldı")}
}
async function importEQ(file){
 if(!file)return;
 if(file.size>60000){toast("EQ dosyası çok büyük");return}
 try{
  const value=JSON.parse(await file.text());
  if(!value||value.type!=="drivetone.eq"||value.version!==1||!Array.isArray(value.bands)||value.bands.length!==28||!value.bands.every(n=>typeof n==="number"&&Number.isFinite(n)&&n>=-12&&n<=12))throw new Error("Geçersiz DRIVETONE EQ profili");
  state.eq=value.bands.slice();state.preset="Özel";
  if(typeof value.sub==="number"&&Number.isFinite(value.sub))state.sub=Math.max(-6,Math.min(9,value.sub));
  const sb=$("#subwoofer");if(sb)sb.value=state.sub;
  const sub=$("#subDbLabel");if(sub)sub.textContent=(state.sub>0?"+":"")+state.sub+" dB";
  renderBands();renderMacros();renderPresets();applyEQ();persist();
  toast("28 bant EQ profili içe aktarıldı");
 }catch(e){toast(e?.message||"JSON profili okunamadı")}
}
let clock=null;
function sleepTick(){
 if(!settings.sleepDeadline)return;
 const left=settings.sleepDeadline-Date.now();
 if(left<=0){settings.sleepDeadline=0;audio.pause();const b=$("#dt5-sleep-status");if(b)b.textContent="Süre doldu · Yerel oynatma duraklatıldı";if(clock){clearInterval(clock);clock=null}toast("Uyku zamanlayıcısı yerel müziği durdurdu");return}
 const b=$("#dt5-sleep-status");if(b){const s=Math.ceil(left/1000);b.textContent=Math.floor(s/60)+" dk "+String(s%60).padStart(2,"0")+" sn kaldı"}
}
function sleepSet(minutes){
 if(clock){clearInterval(clock);clock=null}
 settings.sleepDeadline=minutes>0?Date.now()+minutes*60000:0;
 const b=$("#dt5-sleep-status");
 if(minutes===0){if(b)b.textContent="Zamanlayıcı kapalı";toast("Uyku zamanlayıcısı kapatıldı");return}
 sleepTick();clock=setInterval(sleepTick,1000);toast(minutes+" dakika sonra yerel oynatma duracak");
}
function init(){
 const search=$("#dt5-search");
 if(search)search.addEventListener("input",e=>{settings.search=e.target.value;renderFiles()});
 const filter=$("#dt5-favorites");
 if(filter)filter.onclick=()=>{settings.favoriteFilter=!settings.favoriteFilter;filter.classList.toggle("selected",settings.favoriteFilter);filter.setAttribute("aria-pressed",String(settings.favoriteFilter));renderFiles()};
 const favorite=$("#dt5-favorite-current");if(favorite)favorite.onclick=()=>toggleFavorite(state.fileIndex);
 const shuffle=$("#dt5-shuffle");if(shuffle)shuffle.onclick=()=>setShuffle(!settings.shuffle);
 setShuffle(settings.shuffle);
 const repeat=$("#dt5-repeat");if(repeat){repeat.onclick=cycleRepeat;repeat.textContent=({off:"Tekrar kapalı",all:"Listeyi tekrarla",one:"Şarkıyı tekrarla"})[settings.repeat]}
 const speed=$("#dt5-speed");if(speed){speed.value=String(settings.speed);speed.onchange=()=>{settings.speed=Number(speed.value);audio.playbackRate=settings.speed;saveSettings();toast("Oynatma hızı "+settings.speed+"×")}}
 audio.playbackRate=settings.speed;
 const ab=$("#dt5-ab");if(ab)ab.onclick=eqCompare;
 const exp=$("#dt5-export");if(exp)exp.onclick=exportEQ;
 const imp=$("#dt5-import");const pick=$("#dt5-eq-picker");
 if(imp&&pick){imp.onclick=()=>pick.click();pick.onchange=e=>{const f=e.target.files?.[0];importEQ(f);pick.value=""}}
 const save=$("#dt5-track-save");if(save)save.onclick=saveTrackEQ;
 const del=$("#dt5-track-remove");if(del)del.onclick=removeTrackEQ;
 $$("[data-sleep]").forEach(b=>b.onclick=()=>sleepSet(Number(b.dataset.sleep)));
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)sleepTick()});
 window.addEventListener("focus",sleepTick);
 const ver=$("#dt5-version");if(ver)ver.textContent="DRIVETONE V5 · 10 yeni özellik";
 renderFiles();updateNow();
}
window.DTFeatures={...settings,onTrackChange,onEnded,resolveNext,renderFiles,eqBypass:false,checkSleep:sleepTick,get eqBypass(){return settings.eqBypass}};
init();
})();
