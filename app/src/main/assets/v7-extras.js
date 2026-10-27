(()=>{"use strict";
const I=window.DTInternal,by=id=>document.getElementById(id);
if(!I)return;
const settings=by("settings");
if(settings)settings.insertAdjacentHTML("beforeend",'<section class="v7-extras"><div class="v7-extras-title">SES ÇIKIŞI / DIAGNOSTICS</div><p>Android’in medya için öngördüğü ses çıkışı. FOR-X komut bağlantısı doğrulaması değildir.</p><div id="v7-route-state" class="v7-route-state">Cihaz yolu araştırılıyor…</div><button id="v7-route-refresh">↻ Ses çıkışını kontrol et</button><div class="v7-extras-title">AYAR YEDEĞİ / RECOVERY</div><p>EQ, kişisel profiller, favoriler, oynatma tercihleri ve V6 ayarlarını tek bir dosyaya kaydet. Müzik dosyaları veya erişim izinleri yedeğe eklenmez.</p><div class="v7-actions"><button id="v7-backup-save">↓ Ayarları yedekle</button><button id="v7-backup-restore">↑ Yedeği geri yükle</button></div><input type="file" hidden id="v7-backup-picker" accept=".json,application/json"><p id="v7-backup-status" aria-live="polite"></p></section>');
document.head.insertAdjacentHTML("beforeend",'<style>.v7-extras{padding:18px 16px;margin:20px 0;border-radius:21px;background:var(--card);border:1px solid var(--line)}.v7-extras-title{font-size:12px;font-weight:850;letter-spacing:1.1px;margin:10px 0}.v7-extras p{color:var(--muted);font-size:11px;line-height:1.65}.v7-route-state{font-size:12px;font-weight:720;border-radius:14px;background:var(--soft);padding:13px;margin:12px 0;overflow-wrap:anywhere}.v7-extras button{border:1px solid var(--line);border-radius:12px;padding:12px 11px;background:var(--paper);min-height:44px;font-size:12px;font-weight:750;color:var(--ink)}.v7-actions{display:flex;flex-wrap:wrap;gap:8px}.v7-actions button{flex:1 1 130px}.v7-extras #v7-backup-status{font-size:11px}</style>');
const invoke=(m,...args)=>I.callNative(m,...args),escape=s=>String(s??"").replace(/[<>]/g,"");
function route(){
 const box=by("v7-route-state");if(!box)return;
 try{
  const raw=invoke("getRoutedOutput");
  if(!raw){box.textContent="Bu veri Android uygulamasından okunabilir.";return}
  const d=JSON.parse(raw);
  if(!d.supported){box.textContent="Doğrulanamadı: "+String(d.reason||"Cihaz bilgisi sağlanmıyor.");return}
  const names=(Array.isArray(d.devices)?d.devices:[]).map(x=>(x.category||"Çıkış")+(x.product?" · "+x.product:""));
  box.textContent=names.length?names.join(" • ")+" (öngörülen medya yönlendirmesi)":"Android ses çıkışı listesi boş";
 }catch(e){box.textContent="Ses çıkışı okunamadı"}
}
by("v7-route-refresh")?.addEventListener("click",route);
const KEY_NAMES=["dt3:settings","dt5:preferences","dt5:favorites","dt5:trackeq","drivetone:v6"];
const MAX_FILE=170000;
function makeBackup(){
 const entries={};
 for(const k of KEY_NAMES){const v=localStorage.getItem(k);if(v!==null){try{entries[k]=JSON.parse(v)}catch{}}}
 return JSON.stringify({type:"drivetone.backup",version:1,date:new Date().toISOString(),entries},null,2);
}
function download(content){
 const b=new Blob([content],{type:"application/json"}),url=URL.createObjectURL(b),a=document.createElement("a");
 a.href=url;a.download="DRIVETONE_Backup.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
by("v7-backup-save")?.addEventListener("click",()=>{
 try{
  const data=makeBackup();
  if(data.length>MAX_FILE){by("v7-backup-status").textContent="Yedek fazla büyük (170 KB).";return}
  let response=null;
  if(window.AndroidBridge&&typeof window.AndroidBridge.saveBackupJson==="function")response=invoke("saveBackupJson",data);
  else {download(data);response="OK:download"}
  by("v7-backup-status").textContent=String(response||"Kaydedilemedi").startsWith("OK:")?"Ayar yedeği oluşturuldu.":"Yedek kaydedilemedi: "+String(response);
 }catch(e){by("v7-backup-status").textContent="Yedekleme hatası"}
});
by("v7-backup-restore")?.addEventListener("click",()=>by("v7-backup-picker")?.click());
by("v7-backup-picker")?.addEventListener("change",async e=>{
 const f=e.target.files?.[0];e.target.value="";if(!f)return;
 if(f.size>MAX_FILE){by("v7-backup-status").textContent="Yedek 170 KB üstünde olamaz.";return}
 try{
  const p=JSON.parse(await f.text());
  if(!p||p.type!=="drivetone.backup"||p.version!==1||!p.entries||typeof p.entries!=="object"||Array.isArray(p.entries))throw Error("DRIVETONE yedek dosyası değil");
  if(!confirm("Mevcut ses ve favori ayarların yedekteki değerlerle değişecek. Devam edilsin mi?"))return;
  for(const k of KEY_NAMES){if(Object.prototype.hasOwnProperty.call(p.entries,k)){
    const v=p.entries[k],json=JSON.stringify(v);
    if(!json||json.length>130000)throw Error("Yedek alanı çok büyük");
    if(k==="dt3:settings"&&(!v||typeof v!=="object"||!Array.isArray(v.eq)||v.eq.length!==28||!v.eq.every(n=>typeof n==="number"&&Number.isFinite(n)&&Math.abs(n)<=12)))throw Error("EQ ayarları geçersiz");
    localStorage.setItem(k,json)
  }}
  by("v7-backup-status").textContent="Ayarlar geri yüklendi. Uygulamayı kapatıp yeniden aç.";
 }catch(err){by("v7-backup-status").textContent="Yükleme hatası: "+String(err.message||"geçersiz dosya")}
});
route();
})();