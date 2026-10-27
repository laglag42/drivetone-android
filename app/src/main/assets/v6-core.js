(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.DTV6Core=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){"use strict";
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(v))?Number(v):min));
const sources=["local","spotify","youtube","ytmusic","other"];
const genre=["auto","pop","rap","arabesk","rock","acoustic","electronic"];
function detectSource(pkg){if(pkg==="com.spotify.music")return "spotify";if(pkg==="com.google.android.apps.youtube.music")return "ytmusic";if(pkg==="com.google.android.youtube")return "youtube";return "other";}
function makeOffsets(mode,low=0,mid=0){
  if(!genre.includes(mode))mode="auto";
  const data={pop:[1.2,-0.2,1.1],rap:[2.0,-0.8,0.5],arabesk:[.5,1.4,.3],rock:[.8,1.1,1],acoustic:[-.6,1.3,.7],electronic:[1.6,-.5,1.2],auto:[clamp((mid-low)/55,-1.2,1.2),0,.2]}[mode];
  return Array.from({length:28},(_,i)=>i<10?data[0]*(1-i/13):i<19?data[1]:data[2]*(1-(i-19)/16));
}
function protectFromPeak(peak,prior=.95){
 const target=peak>.985?.76:peak>.94?.86:peak>.86?.93:1;
 return clamp(prior+(target-prior)*(target<prior?.45:.09),.70,1);
}
function safeStartVolume(current,enabled,limit){return enabled?Math.min(clamp(current,0,100),clamp(limit,10,75)):clamp(current,0,100);}
function sanitize(raw){
 const v=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{};
 const profiles={};for(const k of sources){if(typeof v.profiles?.[k]==="string"&&["Natural","Bass Plus","Pop","Vokal","Elektronik","Arabesk","Rock","Gece","Kişisel"].includes(v.profiles[k]))profiles[k]=v.profiles[k];}
 return {brain:v.brain===true,brainGenre:genre.includes(v.brainGenre)?v.brainGenre:"auto",protect:v.protect!==false,haptics:v.haptics!==false,safeEnabled:v.safeEnabled===true,safeLimit:clamp(v.safeLimit??35,10,75),profiles};
}
return {clamp,sources,genre,detectSource,makeOffsets,protectFromPeak,safeStartVolume,sanitize};
});
