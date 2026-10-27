(()=>{"use strict";
const I=window.DTInternal;if(!I)return;
document.body.classList.add("v12-design");
const $=s=>document.querySelector(s);
const icon=(name)=>({source:'<path d="M7 7l10 10-5 4V3l5 4L7 17"/>',eq:'<path d="M4 8v8M10 4v16M16 7v10M22 3v18"/>',cabin:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>',profiles:'<path d="M4 15V9M8 19V5M12 14v-4M16 17V7M20 13v-2"/>'}[name]||"");
const svg=s=>'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+icon(s)+'</svg>';
const home=$("#home");
if(home){
home.insertAdjacentHTML("afterbegin",'<div class="v12-overline">CAR AUDIO COMMAND CENTER</div>');
const actions='<div class="v12-shortcuts">'+[
["sources","Source","Bluetooth","source"],["eq","Audio","Studio","eq"],["cabin","Cabin","Focus","cabin"],["settings","Sound","Profiles","profiles"]
].map(([tab,a,b,img],i)=>'<button class="v12-shortcut" data-tab="'+tab+'" data-active="'+(i===0)+'" aria-label="'+a+" "+b+'">'+svg(img)+'<span>'+a+'<br>'+b+'</span></button>').join("")+'</div>';
home.querySelector(".volume-action")?.insertAdjacentHTML("afterend",actions);
home.querySelector(".player-card")?.setAttribute("aria-label","Şimdi çalan parça");
home.querySelector(".statusbar")?.setAttribute("title","Donanım bağlantısı ayrı olarak doğrulanmalıdır");
}
const eq=$("#eq");
if(eq){
const curve=document.createElement("div");curve.className="v12-eq-curve";curve.setAttribute("aria-label","28 bant EQ eğrisi");
const svgGraph=document.createElementNS("http://www.w3.org/2000/svg","svg");svgGraph.setAttribute("viewBox","0 0 340 145");svgGraph.setAttribute("preserveAspectRatio","none");
curve.append(svgGraph);
const card=eq.querySelector(".eq-card");if(card)card.insertBefore(curve,card.querySelector(".spectrum"));
function redraw(){
const bands=I.state?.eq;if(!Array.isArray(bands))return;
let pts=bands.map((db,i)=>[(i/(bands.length-1))*320+10,70-db*4.3]);
let poly=pts.map(p=>p.map(x=>Math.round(x*10)/10).join(",")).join(" ");
let path="M "+pts.map(p=>p.join(" ")).join(" L ");
const ns="http://www.w3.org/2000/svg";
svgGraph.replaceChildren();
const defs=document.createElementNS(ns,"defs");defs.innerHTML='<linearGradient id="v12linefill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#228bff" stop-opacity=".35"/><stop offset="1" stop-color="#228bff" stop-opacity="0"/></linearGradient>';svgGraph.append(defs);
for(let i=0;i<6;i++){const e=document.createElementNS(ns,"line");e.setAttribute("class","grid");e.setAttribute("x1","0");e.setAttribute("x2","340");e.setAttribute("y1",String(20+i*22));e.setAttribute("y2",String(20+i*22));svgGraph.append(e)}
const area=document.createElementNS(ns,"path");area.setAttribute("class","fill");area.setAttribute("d",path+" L 330 145 L 10 145 Z");svgGraph.append(area);
const line=document.createElementNS(ns,"path");line.setAttribute("class","line");line.setAttribute("d",path);svgGraph.append(line);
pts.filter((p,i)=>i%3===0||i===pts.length-1).forEach(p=>{const d=document.createElementNS(ns,"circle");d.setAttribute("class","dot");d.setAttribute("cx",String(p[0]));d.setAttribute("cy",String(p[1]));d.setAttribute("r","3.3");svgGraph.append(d)});
}
redraw();
let last="";setInterval(()=>{if(document.hidden)return;const x=JSON.stringify(I.state.eq);if(x!==last){last=x;redraw()}},280);
}
const cabin=$("#cabin");
if(cabin){
const html='<div class="v12-cabin-presets" aria-label="Sanal ses sahnesi profilleri">'+[
["Merkez",0,0],["Sürücü",-40,-40],["Ön",0,-65],["Arka",0,65]
].map(([label,x,y],i)=>'<button type="button" data-pos-x="'+x+'" data-pos-y="'+y+'" aria-pressed="'+(i===0)+'">'+label+'</button>').join("")+'</div>';
cabin.querySelector(".car-shell")?.insertAdjacentHTML("afterend",html);
cabin.querySelectorAll(".v12-cabin-presets button").forEach(b=>b.addEventListener("click",()=>{
 const x=Number(b.dataset.posX),y=Number(b.dataset.posY);
 const bal=$("#balance"),fader=$("#fader");if(bal){bal.value=x;bal.dispatchEvent(new Event("input",{bubbles:true}))}if(fader){fader.value=y;fader.dispatchEvent(new Event("input",{bubbles:true}))}
 cabin.querySelectorAll(".v12-cabin-presets button").forEach(p=>p.setAttribute("aria-pressed",String(p===b)));
}));
}
const source=$("#sources");
if(source){
let p=document.createElement("section");p.className="v12-bridge";
p.innerHTML='<div class="v12-overline">MEDIA BRIDGE</div><h2>Bring your music together.</h2><p>Spotify, YouTube Music ve yerel şarkıları aynı merkezden aç. Bildirimlere erişim bu güvenlik sürümünde kapalı; diğer uygulamaların mesajları okunmaz.</p><div class="v12-bridge-visual"><div class="v12-device v12-phone">'+svg("source")+'</div><div class="v12-device v12-radio">'+svg("profiles")+'</div></div><button type="button" id="v12-bridge-open">Müzik kütüphanemi aç</button><p class="v12-warning">FOR-X teybinin özel DSP ve kaynak değiştirme komutları henüz doğrulanmadı.</p>';
source.insertBefore(p,source.querySelector(".source-card"));
$("#v12-bridge-open")?.addEventListener("click",()=>{$("#v7-library")?.scrollIntoView({behavior:"smooth"})});
}
let currentTab="home";
const oldGo=window.DRIVETONE?.goTo;
function mark(tab){currentTab=tab;document.querySelectorAll(".v12-shortcut").forEach(b=>{b.dataset.active=String(b.dataset.tab===tab)});}
document.querySelectorAll(".nav button").forEach(b=>b.addEventListener("click",()=>mark(b.dataset.tab)));
document.querySelectorAll(".v12-shortcut").forEach(b=>b.addEventListener("click",()=>{mark(b.dataset.tab);if(typeof oldGo==="function")oldGo(b.dataset.tab)}));
const dark=$("#darkToggle");if(dark){dark.setAttribute("aria-label","DRIVETONE koyu tema etkin");dark.disabled=true}
const ver=$("#dt5-version");if(ver)ver.textContent="DRIVETONE V12 · BLUE COCKPIT";
window.DTV12={redesign:true,variant:"blue-cockpit"};
})();